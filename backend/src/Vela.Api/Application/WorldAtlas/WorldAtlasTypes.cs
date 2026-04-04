using BitMiracle.LibTiff.Classic;
using NetTopologySuite.Geometries.Prepared;

namespace Vela.Api.Application;

internal sealed record GradientStop(double Position, SixLabors.ImageSharp.PixelFormats.Rgba32 Color);

internal sealed record AtlasMetadata(
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
        var x = WorldAtlasMath.ClampToInt((int)Math.Floor((lon - MinLon) / XResolution), 0, Width - 1);
        var y = WorldAtlasMath.ClampToInt((int)Math.Floor((MaxLat - lat) / YResolution), 0, Height - 1);
        return new PixelCoordinate(x, y);
    }
}

internal sealed record PixelCoordinate(int X, int Y);

internal sealed record CountryBoundary(
    string CountryCode,
    string CountryName,
    NetTopologySuite.Geometries.Geometry Shape,
    IPreparedGeometry PreparedShape
);

internal sealed class RasterSampler : IDisposable
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

internal sealed record TileBounds(double MinLon, double MaxLon, double MinLat, double MaxLat)
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
