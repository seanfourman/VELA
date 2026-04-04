using Microsoft.Extensions.Caching.Memory;
using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Prepared;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using Vela.Api.DTOs;
using static Vela.Api.Application.WorldAtlasConstants;
using static Vela.Api.Application.WorldAtlasMath;

namespace Vela.Api.Application;

public sealed class WorldAtlasService
{
    private const double IsraelPalestineExclusionBufferDegrees = 0.15d;
    private const int MinimumDarkSpotCount = 3;
    private const int MaximumDarkSpotCount = 12;
    private static readonly double[] MinimumWaterBoundaryDistanceFallbackDegrees =
    [
        0.01d,
        0.005d,
        0d,
    ];
    private static readonly double[] IsraelPalestineExclusionFallbackBufferDegrees =
    [
        IsraelPalestineExclusionBufferDegrees,
        0.05d,
        0.04d,
        0.035d,
        0.03d,
        0.02d,
        0.01d,
        0d,
    ];

    private readonly IMemoryCache _memoryCache;
    private readonly WorldAtlasDataLoader _dataLoader;
    private readonly Lazy<AtlasMetadata> _metadata;
    private readonly Lazy<Geometry> _landGeometry;
    private readonly Lazy<Geometry> _landBoundary;
    private readonly Lazy<IPreparedGeometry> _landMask;
    private readonly Lazy<IReadOnlyList<CountryBoundary>> _countryBoundaries;
    private readonly Lazy<Geometry?> _palestineTerritoryGeometry;

    public WorldAtlasService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IMemoryCache memoryCache
    )
    {
        _memoryCache = memoryCache;
        _dataLoader = new WorldAtlasDataLoader(configuration, environment);
        _metadata = new Lazy<AtlasMetadata>(_dataLoader.LoadMetadata, LazyThreadSafetyMode.ExecutionAndPublication);
        _landGeometry = new Lazy<Geometry>(_dataLoader.LoadLandGeometry, LazyThreadSafetyMode.ExecutionAndPublication);
        _landBoundary = new Lazy<Geometry>(() => _landGeometry.Value.Boundary, LazyThreadSafetyMode.ExecutionAndPublication);
        _landMask = new Lazy<IPreparedGeometry>(
            () => PreparedGeometryFactory.Prepare(_landGeometry.Value),
            LazyThreadSafetyMode.ExecutionAndPublication
        );
        _countryBoundaries = new Lazy<IReadOnlyList<CountryBoundary>>(
            _dataLoader.LoadCountryBoundaries,
            LazyThreadSafetyMode.ExecutionAndPublication
        );
        _palestineTerritoryGeometry = new Lazy<Geometry?>(
            CreatePalestineTerritoryGeometry,
            LazyThreadSafetyMode.ExecutionAndPublication
        );
    }

    public SkyQualityResponseDto GetSkyQuality(double lat, double lon)
    {
        var atlas = _metadata.Value;
        EnsureCoordinatesInBounds(atlas, lat, lon);

        using var sampler = new RasterSampler(atlas);
        var pixel = atlas.ToPixel(lat, lon);
        if (!sampler.TryGetFiniteArtificial(pixel.X, pixel.Y, out var artificial))
        {
            throw new KeyNotFoundException("No data at this coordinate");
        }

        return BuildSkyQualityResponse(lat, lon, artificial);
    }

    public DarkSpotsResponseDto GetDarkSpots(double lat, double lon, double searchDistanceKm)
    {
        var atlas = _metadata.Value;
        EnsureCoordinatesInBounds(atlas, lat, lon);

        // Convert the radial search into a clipped raster window before scanning candidate pixels.
        var radiusKm = Clamp(searchDistanceKm, 1d, 250d);
        var latDelta = radiusKm / 110.574d;
        var lonDelta = radiusKm / (111.32d * Math.Max(Math.Abs(Math.Cos(ToRadians(lat))), 0.2d));

        var clippedMinLon = Clamp(lon - lonDelta, atlas.MinLon, atlas.MaxLon);
        var clippedMaxLon = Clamp(lon + lonDelta, atlas.MinLon, atlas.MaxLon);
        var clippedMinLat = Clamp(lat - latDelta, atlas.MinLat, atlas.MaxLat);
        var clippedMaxLat = Clamp(lat + latDelta, atlas.MinLat, atlas.MaxLat);

        var colStart = ClampToInt((int)Math.Floor((clippedMinLon - atlas.MinLon) / atlas.XResolution), 0, atlas.Width - 1);
        var colEnd = ClampToInt((int)Math.Ceiling((clippedMaxLon - atlas.MinLon) / atlas.XResolution), colStart + 1, atlas.Width);
        var rowStart = ClampToInt((int)Math.Floor((atlas.MaxLat - clippedMaxLat) / atlas.YResolution), 0, atlas.Height - 1);
        var rowEnd = ClampToInt((int)Math.Ceiling((atlas.MaxLat - clippedMinLat) / atlas.YResolution), rowStart + 1, atlas.Height);

        var windowWidth = colEnd - colStart;
        var windowHeight = rowEnd - rowStart;
        if (windowWidth <= 0 || windowHeight <= 0)
        {
            return CreateDarkSpotResponse(lat, lon, radiusKm, []);
        }

        var originCountry = ResolveOriginCountry(lat, lon);
        if (originCountry is null)
        {
            return CreateDarkSpotResponse(lat, lon, radiusKm, []);
        }

        var candidates = SampleDarkSpotCandidates(
            atlas,
            lat,
            lon,
            radiusKm,
            originCountry,
            colStart,
            rowStart,
            windowWidth,
            windowHeight
        );

        return CreateDarkSpotResponse(lat, lon, radiusKm, SelectDistinctDarkSpots(candidates, radiusKm, originCountry));
    }

    public Task<LightmapTileResponse> GetLightTileAsync(
        int z,
        int x,
        int y,
        CancellationToken cancellationToken = default
    )
    {
        if (z < 0 || x < 0 || y < 0 || x >= (1 << z) || y >= (1 << z))
        {
            throw new ArgumentOutOfRangeException(nameof(z), "Invalid tile coordinates");
        }

        var cacheKey = $"lightmap:{z}:{x}:{y}";
        if (_memoryCache.TryGetValue(cacheKey, out byte[]? cached) && cached is not null)
        {
            return Task.FromResult(new LightmapTileResponse { Content = cached });
        }

        var atlas = _metadata.Value;
        var tileBounds = TileBounds.FromXyz(x, y, z);
        var atlasBounds = new TileBounds(atlas.MinLon, atlas.MaxLon, atlas.MinLat, atlas.MaxLat);

        if (!tileBounds.Intersects(atlasBounds))
        {
            return Task.FromResult(new LightmapTileResponse { Content = EmptyTile });
        }

        var content = RenderLightTile(atlas, tileBounds, cancellationToken);
        _memoryCache.Set(cacheKey, content, LightTileCacheDuration);

        return Task.FromResult(new LightmapTileResponse { Content = content });
    }

    private static SkyQualityResponseDto BuildSkyQualityResponse(double lat, double lon, float artificial)
    {
        var total = artificial + NaturalMcdM2;
        var sqm = Math.Log10(total / SqmDenominator) / -0.4d;
        var ratio = artificial / NaturalMcdM2;

        return new SkyQualityResponseDto
        {
            Coordinates = [RoundTo(lat, 5), RoundTo(lon, 5)],
            SQM = RoundTo(sqm, 2),
            BrightnessMcdM2 = RoundTo(total, 1),
            ArtificialBrightnessUccdM2 = (int)Math.Round(artificial * 1000d),
            Ratio = RoundTo(ratio, 1),
            Bortle = BortleFromSqm(sqm),
        };
    }

    private List<DarkSpotDto> SampleDarkSpotCandidates(
        AtlasMetadata atlas,
        double originLat,
        double originLon,
        double radiusKm,
        CountryBoundary originCountry,
        int colStart,
        int rowStart,
        int windowWidth,
        int windowHeight
    )
    {
        // Downsample large search windows so the endpoint stays responsive during map interaction.
        var stride = Math.Max(1, (int)Math.Floor(Math.Sqrt((windowWidth * windowHeight) / (double)MaxSamples)));
        var landMask = _landMask.Value;
        var geometryFactory = GeometryFactory.Default;
        var candidates = new List<DarkSpotDto>();

        using var sampler = new RasterSampler(atlas);
        for (var row = 0; row < windowHeight; row += stride)
        {
            var worldRow = rowStart + row;
            var sampleLat = atlas.MaxLat - ((worldRow + 0.5d) * atlas.YResolution);
            for (var col = 0; col < windowWidth; col += stride)
            {
                var worldCol = colStart + col;
                var sampleLon = atlas.MinLon + ((worldCol + 0.5d) * atlas.XResolution);
                var distanceKm = HaversineKm(originLat, originLon, sampleLat, sampleLon);
                if (distanceKm > radiusKm)
                {
                    continue;
                }

                var point = geometryFactory.CreatePoint(new Coordinate(sampleLon, sampleLat));
                if (!landMask.Intersects(point))
                {
                    continue;
                }

                if (!originCountry.PreparedShape.Intersects(point))
                {
                    continue;
                }

                if (!sampler.TryGetFiniteArtificial(worldCol, worldRow, out var artificial))
                {
                    continue;
                }

                var totalBrightness = artificial + NaturalMcdM2;
                var sqm = Math.Log10(totalBrightness / SqmDenominator) / -0.4d;
                var bortle = BortleFromSqm(sqm);

                candidates.Add(
                    new DarkSpotDto
                    {
                        Lat = RoundTo(sampleLat, 5),
                        Lon = RoundTo(sampleLon, 5),
                        Level = ParseBortleLevel(bortle),
                        LightValue = RoundTo(artificial, 3),
                        Sqm = RoundTo(sqm, 2),
                        DistanceKm = RoundTo(distanceKm, 1),
                    }
                );
            }
        }

        candidates.Sort(
            static (left, right) =>
            {
                var valueComparison = left.LightValue.CompareTo(right.LightValue);
                return valueComparison != 0
                    ? valueComparison
                    : left.DistanceKm.CompareTo(right.DistanceKm);
            }
        );

        return candidates;
    }

    private CountryBoundary? ResolveOriginCountry(double lat, double lon)
    {
        var point = GeometryFactory.Default.CreatePoint(new Coordinate(lon, lat));
        foreach (var boundary in _countryBoundaries.Value)
        {
            if (boundary.PreparedShape.Intersects(point))
            {
                return boundary;
            }
        }

        return null;
    }

    private Geometry? CreatePalestineTerritoryGeometry()
    {
        var palestineShapes = _countryBoundaries.Value
            .Where(IsPalestineBoundary)
            .Select(static boundary => boundary.Shape)
            .ToList();

        if (palestineShapes.Count == 0)
        {
            return null;
        }

        return GeometryFactory.Default.BuildGeometry(palestineShapes).Union();
    }

    private List<DarkSpotDto> SelectDistinctDarkSpots(
        List<DarkSpotDto> candidates,
        double radiusKm,
        CountryBoundary originCountry
    )
    {
        if (!IsIsraelBoundary(originCountry))
        {
            return SelectDarkSpotsWithWaterBoundaryFallback(candidates, radiusKm);
        }

        List<DarkSpotDto> bestSelection = [];
        foreach (var exclusionBufferDegrees in IsraelPalestineExclusionFallbackBufferDegrees)
        {
            var filtered = FilterCandidatesForOriginCountry(candidates, originCountry, exclusionBufferDegrees);
            var selected = SelectDarkSpotsWithWaterBoundaryFallback(filtered, radiusKm);

            if (selected.Count > bestSelection.Count)
            {
                bestSelection = selected;
            }

            if (selected.Count >= MinimumDarkSpotCount)
            {
                return selected;
            }
        }

        return bestSelection;
    }

    private List<DarkSpotDto> SelectDarkSpotsWithWaterBoundaryFallback(List<DarkSpotDto> candidates, double radiusKm)
    {
        List<DarkSpotDto> bestSelection = [];
        foreach (var minimumWaterBoundaryDistanceDegrees in MinimumWaterBoundaryDistanceFallbackDegrees)
        {
            var filtered = FilterCandidatesByWaterBoundaryDistance(candidates, minimumWaterBoundaryDistanceDegrees);
            var selected = SelectDistinctDarkSpotsWithFallbackSeparation(filtered, radiusKm);

            if (selected.Count > bestSelection.Count)
            {
                bestSelection = selected;
            }

            if (selected.Count >= MinimumDarkSpotCount)
            {
                return selected;
            }
        }

        return bestSelection;
    }

    private List<DarkSpotDto> FilterCandidatesForOriginCountry(
        List<DarkSpotDto> candidates,
        CountryBoundary originCountry,
        double exclusionBufferDegrees
    )
    {
        if (!IsIsraelBoundary(originCountry))
        {
            return candidates;
        }

        var palestineGeometry = _palestineTerritoryGeometry.Value;
        if (palestineGeometry is null)
        {
            return candidates;
        }

        var filtered = new List<DarkSpotDto>(candidates.Count);
        foreach (var candidate in candidates)
        {
            if (!ShouldExcludeCandidateForOriginCountry(candidate, palestineGeometry, exclusionBufferDegrees))
            {
                filtered.Add(candidate);
            }
        }

        return filtered;
    }

    private List<DarkSpotDto> FilterCandidatesByWaterBoundaryDistance(
        List<DarkSpotDto> candidates,
        double minimumWaterBoundaryDistanceDegrees
    )
    {
        if (minimumWaterBoundaryDistanceDegrees <= 0d)
        {
            return candidates;
        }

        var landBoundary = _landBoundary.Value;
        var filtered = new List<DarkSpotDto>(candidates.Count);
        foreach (var candidate in candidates)
        {
            var point = GeometryFactory.Default.CreatePoint(new Coordinate(candidate.Lon, candidate.Lat));
            if (landBoundary.Distance(point) > minimumWaterBoundaryDistanceDegrees)
            {
                filtered.Add(candidate);
            }
        }

        return filtered;
    }

    private static bool ShouldExcludeCandidateForOriginCountry(
        DarkSpotDto candidate,
        Geometry palestineGeometry,
        double exclusionBufferDegrees
    )
    {
        var point = GeometryFactory.Default.CreatePoint(new Coordinate(candidate.Lon, candidate.Lat));
        return exclusionBufferDegrees <= 0d
            ? palestineGeometry.Intersects(point)
            : palestineGeometry.Distance(point) <= exclusionBufferDegrees;
    }

    private static List<DarkSpotDto> SelectDistinctDarkSpotsWithFallbackSeparation(
        List<DarkSpotDto> candidates,
        double radiusKm
    )
    {
        var preferredMinSeparationKm = Math.Max(3d, radiusKm / 8d);
        List<DarkSpotDto> bestSelection = [];

        foreach (var minSeparationKm in GetMinimumSeparationFallbacks(preferredMinSeparationKm))
        {
            var selected = SelectDistinctDarkSpotsForSeparation(candidates, minSeparationKm);

            if (selected.Count > bestSelection.Count)
            {
                bestSelection = selected;
            }

            if (selected.Count >= MinimumDarkSpotCount)
            {
                return selected;
            }
        }

        return bestSelection;
    }

    private static IEnumerable<double> GetMinimumSeparationFallbacks(double preferredMinSeparationKm)
    {
        var seen = new HashSet<double>();
        foreach (var minSeparationKm in new[]
                 {
                     preferredMinSeparationKm,
                     Math.Min(preferredMinSeparationKm, 2.5d),
                     Math.Min(preferredMinSeparationKm, 2d),
                     Math.Min(preferredMinSeparationKm, 1.5d),
                     Math.Min(preferredMinSeparationKm, 1d),
                     0d,
                 })
        {
            if (seen.Add(minSeparationKm))
            {
                yield return minSeparationKm;
            }
        }
    }

    private static bool IsIsraelBoundary(CountryBoundary boundary)
    {
        return string.Equals(boundary.CountryCode, "ISR", StringComparison.OrdinalIgnoreCase)
            || string.Equals(boundary.CountryName, "Israel", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPalestineBoundary(CountryBoundary boundary)
    {
        return string.Equals(boundary.CountryCode, "PSX", StringComparison.OrdinalIgnoreCase)
            || string.Equals(boundary.CountryCode, "PSE", StringComparison.OrdinalIgnoreCase)
            || string.Equals(boundary.CountryName, "Palestine", StringComparison.OrdinalIgnoreCase)
            || string.Equals(boundary.CountryName, "West Bank", StringComparison.OrdinalIgnoreCase)
            || string.Equals(boundary.CountryName, "Gaza", StringComparison.OrdinalIgnoreCase);
    }

    private static List<DarkSpotDto> SelectDistinctDarkSpotsForSeparation(
        List<DarkSpotDto> candidates,
        double minSeparationKm
    )
    {
        // Prefer dark candidates, but keep them spaced out so the client does not receive clustered duplicates.
        var selected = new List<DarkSpotDto>();
        foreach (var candidate in candidates)
        {
            var isFarEnough = minSeparationKm <= 0d
                || selected.TrueForAll(
                    existing => HaversineKm(existing.Lat, existing.Lon, candidate.Lat, candidate.Lon) >= minSeparationKm
                );

            if (!isFarEnough)
            {
                continue;
            }

            selected.Add(candidate);
            if (selected.Count >= MaximumDarkSpotCount)
            {
                break;
            }
        }

        return selected;
    }

    private static DarkSpotsResponseDto CreateDarkSpotResponse(
        double lat,
        double lon,
        double radiusKm,
        List<DarkSpotDto> spots
    )
    {
        return new DarkSpotsResponseDto
        {
            Origin = new DarkSpotOriginDto { Lat = RoundTo(lat, 5), Lon = RoundTo(lon, 5) },
            RadiusKm = radiusKm,
            Spots = spots,
        };
    }

    private static byte[] RenderLightTile(
        AtlasMetadata atlas,
        TileBounds tileBounds,
        CancellationToken cancellationToken
    )
    {
        // Light tiles are rendered from atlas samples so the frontend can use them as a normal raster layer.
        using var sampler = new RasterSampler(atlas);
        using var image = new Image<Rgba32>(LightTileSize, LightTileSize);
        var lonSpan = tileBounds.MaxLon - tileBounds.MinLon;
        var latSpan = tileBounds.MaxLat - tileBounds.MinLat;

        for (var row = 0; row < LightTileSize; row += 1)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var lat = tileBounds.MaxLat - (((row + 0.5d) / LightTileSize) * latSpan);
            for (var col = 0; col < LightTileSize; col += 1)
            {
                var lon = tileBounds.MinLon + (((col + 0.5d) / LightTileSize) * lonSpan);
                var sourceX = ((lon - atlas.MinLon) / atlas.XResolution) - 0.5d;
                var sourceY = ((atlas.MaxLat - lat) / atlas.YResolution) - 0.5d;

                image[col, row] = TrySampleArtificialBilinear(sampler, sourceX, sourceY, out var artificial)
                    ? ColorFromArtificial(artificial)
                    : default;
            }
        }

        using var stream = new MemoryStream();
        image.Save(stream, new PngEncoder());
        return stream.ToArray();
    }
}
