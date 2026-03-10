using System.Globalization;
using BitMiracle.LibTiff.Classic;
using Microsoft.Extensions.Caching.Memory;
using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Prepared;
using NetTopologySuite.IO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using Vela.Api.DTOs;

namespace Vela.Api.Application;

public sealed class WorldAtlasService : IWorldAtlasService
{
    private const double NaturalMcdM2 = 0.171168465d;
    private const double SqmDenominator = 108000000d;
    private const double MinSqm = 16d;
    private const double MaxSqm = 22d;
    private const int LightTileSize = 256;
    private const int MaxSamples = 9000;
    private static readonly TimeSpan LightTileCacheDuration = TimeSpan.FromMinutes(10);
    private static readonly byte[] EmptyTile = BuildEmptyTile();
    private static readonly GradientStop[] LightGradient =
    [
        new(0d, new Rgba32(30, 170, 95, 70)),
        new(0.35d, new Rgba32(92, 200, 118, 120)),
        new(0.55d, new Rgba32(210, 190, 70, 150)),
        new(0.78d, new Rgba32(245, 155, 65, 190)),
        new(1d, new Rgba32(230, 70, 70, 220)),
    ];

    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IMemoryCache _memoryCache;
    private readonly Lazy<AtlasMetadata> _metadata;
    private readonly Lazy<IPreparedGeometry> _landMask;

    public WorldAtlasService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IMemoryCache memoryCache
    )
    {
        _configuration = configuration;
        _environment = environment;
        _memoryCache = memoryCache;
        _metadata = new Lazy<AtlasMetadata>(LoadMetadata, LazyThreadSafetyMode.ExecutionAndPublication);
        _landMask = new Lazy<IPreparedGeometry>(LoadLandMask, LazyThreadSafetyMode.ExecutionAndPublication);
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
            return new DarkSpotsResponseDto
            {
                Origin = new DarkSpotOriginDto { Lat = RoundTo(lat, 5), Lon = RoundTo(lon, 5) },
                RadiusKm = radiusKm,
                Spots = [],
            };
        }

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
                var distanceKm = HaversineKm(lat, lon, sampleLat, sampleLon);
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

        var minSeparationKm = Math.Max(3d, radiusKm / 8d);
        var selected = new List<DarkSpotDto>();
        foreach (var candidate in candidates)
        {
            var isFarEnough = selected.TrueForAll(
                existing =>
                    HaversineKm(existing.Lat, existing.Lon, candidate.Lat, candidate.Lon)
                    >= minSeparationKm
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

        return new DarkSpotsResponseDto
        {
            Origin = new DarkSpotOriginDto { Lat = RoundTo(lat, 5), Lon = RoundTo(lon, 5) },
            RadiusKm = radiusKm,
            Spots = selected,
        };
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
        var content = stream.ToArray();
        _memoryCache.Set(cacheKey, content, LightTileCacheDuration);

        return Task.FromResult(new LightmapTileResponse { Content = content });
    }

    private SkyQualityResponseDto BuildSkyQualityResponse(double lat, double lon, float artificial)
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

    private AtlasMetadata LoadMetadata()
    {
        var tiffPath = ResolveWorldAtlasPath();
        using var tiff = Tiff.Open(tiffPath, "r")
            ?? throw new InvalidOperationException("Could not open the World Atlas TIFF dataset.");

        var width = GetRequiredIntField(tiff, TiffTag.IMAGEWIDTH);
        var height = GetRequiredIntField(tiff, TiffTag.IMAGELENGTH);
        var tileWidth = GetRequiredIntField(tiff, TiffTag.TILEWIDTH);
        var tileHeight = GetRequiredIntField(tiff, TiffTag.TILELENGTH);
        var pixelScale = GetRequiredDoubleArray(tiff, TiffTag.GEOTIFF_MODELPIXELSCALETAG);
        var tiePoint = GetRequiredDoubleArray(tiff, TiffTag.GEOTIFF_MODELTIEPOINTTAG);
        var noDataRaw = GetOptionalStringField(tiff, TiffTag.GDAL_NODATA);
        var noData = ParseNoData(noDataRaw);

        var minLon = tiePoint[3];
        var maxLat = tiePoint[4];
        var xResolution = pixelScale[0];
        var yResolution = pixelScale[1];
        var maxLon = minLon + (width * xResolution);
        var minLat = maxLat - (height * yResolution);

        return new AtlasMetadata(
            tiffPath,
            width,
            height,
            tileWidth,
            tileHeight,
            tiff.TileSize(),
            minLon,
            maxLon,
            minLat,
            maxLat,
            xResolution,
            yResolution,
            noData
        );
    }

    private IPreparedGeometry LoadLandMask()
    {
        var landMaskPath = ResolveLandMaskPath();
        var json = File.ReadAllText(landMaskPath);
        var geometry = new GeoJsonReader().Read<Geometry>(json)
            ?? throw new InvalidOperationException("Could not parse the land-mask geometry.");

        return PreparedGeometryFactory.Prepare(geometry);
    }

    private string ResolveWorldAtlasPath()
    {
        var configured = _configuration["WorldAtlas:Path"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            var resolved = ResolvePath(configured);
            if (File.Exists(resolved))
            {
                return resolved;
            }
        }

        foreach (var candidate in GetWorldAtlasCandidates())
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        throw new FileNotFoundException(
            "World_Atlas_2015.tif was not found. Expected it in data/ or public/."
        );
    }

    private string ResolveLandMaskPath()
    {
        var configured = _configuration["WorldAtlas:LandMaskPath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            var resolved = ResolvePath(configured);
            if (File.Exists(resolved))
            {
                return resolved;
            }
        }

        var bundled = Path.Combine(_environment.ContentRootPath, "Data", "land-10m.geojson");
        if (File.Exists(bundled))
        {
            return bundled;
        }

        throw new FileNotFoundException("land-10m.geojson was not found for the backend land mask.");
    }

    private IEnumerable<string> GetWorldAtlasCandidates()
    {
        var contentRoot = _environment.ContentRootPath;
        yield return Path.Combine(contentRoot, "Data", "World_Atlas_2015.tif");

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var depth = 0; depth <= 4; depth += 1)
        {
            var baseDirectory = contentRoot;
            if (depth > 0)
            {
                var segments = new string[depth + 1];
                segments[0] = contentRoot;
                for (var index = 1; index < segments.Length; index += 1)
                {
                    segments[index] = "..";
                }

                baseDirectory = Path.GetFullPath(Path.Combine(segments));
            }

            foreach (var relativeDirectory in new[] { "data", "public" })
            {
                var candidate = Path.Combine(baseDirectory, relativeDirectory, "World_Atlas_2015.tif");
                if (seen.Add(candidate))
                {
                    yield return candidate;
                }
            }
        }
    }

    private string ResolvePath(string configuredPath)
    {
        return Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, configuredPath));
    }

    private static void EnsureCoordinatesInBounds(AtlasMetadata atlas, double lat, double lon)
    {
        if (lon < atlas.MinLon || lon > atlas.MaxLon || lat < atlas.MinLat || lat > atlas.MaxLat)
        {
            throw new ArgumentOutOfRangeException(nameof(lat), "Coordinates out of dataset bounds");
        }
    }

    private static bool TrySampleArtificialBilinear(
        RasterSampler sampler,
        double sourceX,
        double sourceY,
        out double artificial
    )
    {
        artificial = 0d;

        var nearestX = ClampToInt((int)Math.Round(sourceX), 0, sampler.Metadata.Width - 1);
        var nearestY = ClampToInt((int)Math.Round(sourceY), 0, sampler.Metadata.Height - 1);
        if (!sampler.TryGetFiniteArtificial(nearestX, nearestY, out var nearest))
        {
            return false;
        }

        var x0 = ClampToInt((int)Math.Floor(sourceX), 0, sampler.Metadata.Width - 1);
        var y0 = ClampToInt((int)Math.Floor(sourceY), 0, sampler.Metadata.Height - 1);
        var x1 = ClampToInt(x0 + 1, 0, sampler.Metadata.Width - 1);
        var y1 = ClampToInt(y0 + 1, 0, sampler.Metadata.Height - 1);

        if (
            !sampler.TryGetFiniteArtificial(x0, y0, out var q00)
            || !sampler.TryGetFiniteArtificial(x1, y0, out var q10)
            || !sampler.TryGetFiniteArtificial(x0, y1, out var q01)
            || !sampler.TryGetFiniteArtificial(x1, y1, out var q11)
        )
        {
            artificial = nearest;
            return true;
        }

        var tx = Clamp(sourceX - x0, 0d, 1d);
        var ty = Clamp(sourceY - y0, 0d, 1d);
        var top = (q00 * (1d - tx)) + (q10 * tx);
        var bottom = (q01 * (1d - tx)) + (q11 * tx);
        artificial = (top * (1d - ty)) + (bottom * ty);
        return true;
    }

    private static Rgba32 ColorFromArtificial(double artificial)
    {
        if (!double.IsFinite(artificial) || artificial < 0d)
        {
            return default;
        }

        var total = artificial + NaturalMcdM2;
        if (!double.IsFinite(total) || total <= 0d)
        {
            return default;
        }

        var sqm = Math.Log10(total / SqmDenominator) / -0.4d;
        var clampedSqm = Clamp(sqm, MinSqm, MaxSqm);
        var normalized = 1d - ((clampedSqm - MinSqm) / (MaxSqm - MinSqm));
        return InterpolateGradient(normalized);
    }

    private static Rgba32 InterpolateGradient(double t)
    {
        if (t <= LightGradient[0].Position)
        {
            return LightGradient[0].Color;
        }

        if (t >= LightGradient[^1].Position)
        {
            return LightGradient[^1].Color;
        }

        for (var index = 0; index < LightGradient.Length - 1; index += 1)
        {
            var start = LightGradient[index];
            var end = LightGradient[index + 1];
            if (t < start.Position || t > end.Position)
            {
                continue;
            }

            var span = end.Position - start.Position;
            var localT = span <= 0d ? 0d : (t - start.Position) / span;
            return new Rgba32(
                Lerp(start.Color.R, end.Color.R, localT),
                Lerp(start.Color.G, end.Color.G, localT),
                Lerp(start.Color.B, end.Color.B, localT),
                Lerp(start.Color.A, end.Color.A, localT)
            );
        }

        return LightGradient[^1].Color;
    }

    private static byte Lerp(byte start, byte end, double t)
    {
        return (byte)Math.Round(start + ((end - start) * t));
    }

    private static string BortleFromSqm(double sqm)
    {
        if (sqm >= 21.99d)
        {
            return "class 1";
        }

        if (sqm >= 21.89d)
        {
            return "class 2";
        }

        if (sqm >= 21.69d)
        {
            return "class 3";
        }

        if (sqm >= 20.49d)
        {
            return "class 4";
        }

        if (sqm >= 19.5d)
        {
            return "class 5";
        }

        if (sqm >= 18.94d)
        {
            return "class 6";
        }

        if (sqm >= 18.38d)
        {
            return "class 7";
        }

        return "class 8-9";
    }

    private static int ParseBortleLevel(string label)
    {
        var match = System.Text.RegularExpressions.Regex.Match(label ?? string.Empty, @"class\s*(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var value) ? value : 9;
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371d;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a =
            Math.Sin(dLat / 2d) * Math.Sin(dLat / 2d)
            + (Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Sin(dLon / 2d) * Math.Sin(dLon / 2d));
        var c = 2d * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));
        return earthRadiusKm * c;
    }

    private static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180d;
    }

    private static double RoundTo(double value, int decimals)
    {
        var factor = Math.Pow(10d, decimals);
        return Math.Round(value * factor) / factor;
    }

    private static double Clamp(double value, double min, double max)
    {
        if (value < min)
        {
            return min;
        }

        if (value > max)
        {
            return max;
        }

        return value;
    }

    private static int ClampToInt(int value, int min, int max)
    {
        if (value < min)
        {
            return min;
        }

        if (value > max)
        {
            return max;
        }

        return value;
    }

    private static int GetRequiredIntField(Tiff tiff, TiffTag tag)
    {
        var values = tiff.GetField(tag)
            ?? throw new InvalidOperationException($"Missing TIFF field: {tag}");
        return values[0].ToInt();
    }

    private static double[] GetRequiredDoubleArray(Tiff tiff, TiffTag tag)
    {
        var values = tiff.GetField(tag)
            ?? throw new InvalidOperationException($"Missing TIFF field: {tag}");

        foreach (var value in values)
        {
            try
            {
                var array = value.ToDoubleArray();
                if (array.Length > 0)
                {
                    return array;
                }
            }
            catch
            {
            }
        }

        return values.Select(static value => value.ToDouble()).ToArray();
    }

    private static string? GetOptionalStringField(Tiff tiff, TiffTag tag)
    {
        var values = tiff.GetField(tag);
        return values is { Length: > 0 } ? values[0].ToString() : null;
    }

    private static float ParseNoData(string? rawValue)
    {
        return float.TryParse(rawValue, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : -3.4028234663852886e38f;
    }

    private static byte[] BuildEmptyTile()
    {
        using var image = new Image<Rgba32>(LightTileSize, LightTileSize);
        using var stream = new MemoryStream();
        image.Save(stream, new PngEncoder());
        return stream.ToArray();
    }

    private sealed record GradientStop(double Position, Rgba32 Color);

    private sealed record AtlasMetadata(
        string TiffPath,
        int Width,
        int Height,
        int TileWidth,
        int TileHeight,
        int TileSizeBytes,
        double MinLon,
        double MaxLon,
        double MinLat,
        double MaxLat,
        double XResolution,
        double YResolution,
        float NoDataValue
    )
    {
        public int TilesAcross => (Width + TileWidth - 1) / TileWidth;

        public PixelCoordinate ToPixel(double lat, double lon)
        {
            var x = ClampToInt((int)Math.Floor((lon - MinLon) / XResolution), 0, Width - 1);
            var y = ClampToInt((int)Math.Floor((MaxLat - lat) / YResolution), 0, Height - 1);
            return new PixelCoordinate(x, y);
        }
    }

    private sealed record PixelCoordinate(int X, int Y);

    private sealed class RasterSampler : IDisposable
    {
        private readonly Tiff _tiff;
        private readonly Dictionary<int, float[]> _tileCache = new();

        public RasterSampler(AtlasMetadata metadata)
        {
            Metadata = metadata;
            _tiff = Tiff.Open(metadata.TiffPath, "r")
                ?? throw new InvalidOperationException("Could not open the World Atlas TIFF dataset.");
        }

        public AtlasMetadata Metadata { get; }

        public bool TryGetFiniteArtificial(int x, int y, out float artificial)
        {
            artificial = 0f;
            if (x < 0 || y < 0 || x >= Metadata.Width || y >= Metadata.Height)
            {
                return false;
            }

            var tileX = x / Metadata.TileWidth;
            var tileY = y / Metadata.TileHeight;
            var tileIndex = (tileY * Metadata.TilesAcross) + tileX;

            if (!_tileCache.TryGetValue(tileIndex, out var tile))
            {
                tile = ReadTile(tileIndex);
                _tileCache[tileIndex] = tile;
            }

            var localX = x % Metadata.TileWidth;
            var localY = y % Metadata.TileHeight;
            var pixelIndex = (localY * Metadata.TileWidth) + localX;
            if (pixelIndex < 0 || pixelIndex >= tile.Length)
            {
                return false;
            }

            artificial = tile[pixelIndex];
            return float.IsFinite(artificial)
                && artificial != Metadata.NoDataValue
                && artificial >= 0f;
        }

        private float[] ReadTile(int tileIndex)
        {
            var buffer = new byte[Metadata.TileSizeBytes];
            var bytesRead = _tiff.ReadEncodedTile(tileIndex, buffer, 0, Metadata.TileSizeBytes);
            if (bytesRead < 0)
            {
                throw new InvalidOperationException($"Failed to read TIFF tile {tileIndex}.");
            }

            var values = new float[Metadata.TileSizeBytes / sizeof(float)];
            Buffer.BlockCopy(buffer, 0, values, 0, Math.Min(bytesRead, Metadata.TileSizeBytes));
            return values;
        }

        public void Dispose()
        {
            _tiff.Dispose();
        }
    }

    private sealed record TileBounds(double MinLon, double MaxLon, double MinLat, double MaxLat)
    {
        public bool Intersects(TileBounds other)
        {
            return MinLon < other.MaxLon
                && MaxLon > other.MinLon
                && MinLat < other.MaxLat
                && MaxLat > other.MinLat;
        }

        public static TileBounds FromXyz(int x, int y, int z)
        {
            var n = Math.Pow(2d, z);
            var lonLeft = ((double)x / n) * 360d - 180d;
            var lonRight = ((double)(x + 1) / n) * 360d - 180d;
            var latTop = MercatorToLatitude(Math.PI - ((2d * Math.PI * y) / n));
            var latBottom = MercatorToLatitude(Math.PI - ((2d * Math.PI * (y + 1)) / n));
            return new TileBounds(lonLeft, lonRight, latBottom, latTop);
        }

        private static double MercatorToLatitude(double value)
        {
            return (180d / Math.PI) * Math.Atan(0.5d * (Math.Exp(value) - Math.Exp(-value)));
        }
    }
}
