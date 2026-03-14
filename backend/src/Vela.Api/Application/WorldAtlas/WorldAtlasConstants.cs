using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;

namespace Vela.Api.Application;

internal static class WorldAtlasConstants
{
    public const double NaturalMcdM2 = 0.171168465d;
    public const double SqmDenominator = 108000000d;
    public const double MinSqm = 16d;
    public const double MaxSqm = 22d;
    public const int LightTileSize = 256;
    public const int MaxSamples = 9000;

    public static readonly TimeSpan LightTileCacheDuration = TimeSpan.FromMinutes(10);
    public static readonly byte[] EmptyTile = BuildEmptyTile();
    public static readonly GradientStop[] LightGradient =
    [
        new(0d, new Rgba32(30, 170, 95, 70)),
        new(0.35d, new Rgba32(92, 200, 118, 120)),
        new(0.55d, new Rgba32(210, 190, 70, 150)),
        new(0.78d, new Rgba32(245, 155, 65, 190)),
        new(1d, new Rgba32(230, 70, 70, 220)),
    ];

    private static byte[] BuildEmptyTile()
    {
        using var image = new Image<Rgba32>(LightTileSize, LightTileSize);
        using var stream = new MemoryStream();
        image.Save(stream, new PngEncoder());
        return stream.ToArray();
    }
}
