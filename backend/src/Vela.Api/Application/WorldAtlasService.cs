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
    private readonly IMemoryCache _memoryCache;
    private readonly WorldAtlasDataLoader _dataLoader;
    private readonly Lazy<AtlasMetadata> _metadata;
    private readonly Lazy<IPreparedGeometry> _landMask;

    public WorldAtlasService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IMemoryCache memoryCache
    )
    {
        _memoryCache = memoryCache;
        _dataLoader = new WorldAtlasDataLoader(configuration, environment);
        _metadata = new Lazy<AtlasMetadata>(_dataLoader.LoadMetadata, LazyThreadSafetyMode.ExecutionAndPublication);
        _landMask = new Lazy<IPreparedGeometry>(_dataLoader.LoadLandMask, LazyThreadSafetyMode.ExecutionAndPublication);
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

        var candidates = SampleDarkSpotCandidates(
            atlas,
            lat,
            lon,
            radiusKm,
            colStart,
            rowStart,
            windowWidth,
            windowHeight
        );

        return CreateDarkSpotResponse(lat, lon, radiusKm, SelectDistinctDarkSpots(candidates, radiusKm));
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

    private static List<DarkSpotDto> SelectDistinctDarkSpots(List<DarkSpotDto> candidates, double radiusKm)
    {
        // Prefer dark candidates, but keep them spaced out so the client does not receive clustered duplicates.
        var minSeparationKm = Math.Max(3d, radiusKm / 8d);
        var selected = new List<DarkSpotDto>();
        foreach (var candidate in candidates)
        {
            var isFarEnough = selected.TrueForAll(
                existing => HaversineKm(existing.Lat, existing.Lon, candidate.Lat, candidate.Lon) >= minSeparationKm
            );

            if (!isFarEnough)
            {
                continue;
            }

            selected.Add(candidate);
            if (selected.Count >= 12)
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
