using System.Text.RegularExpressions;
using SixLabors.ImageSharp.PixelFormats;
using static Vela.Api.Application.WorldAtlasConstants;

namespace Vela.Api.Application;

internal static class WorldAtlasMath
{
    public static void EnsureCoordinatesInBounds(AtlasMetadata atlas, double lat, double lon)
    {
        if (lon < atlas.MinLon || lon > atlas.MaxLon || lat < atlas.MinLat || lat > atlas.MaxLat)
        {
            throw new ArgumentOutOfRangeException(nameof(lat), "Coordinates out of dataset bounds");
        }
    }

    public static bool TrySampleArtificialBilinear(
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

    public static Rgba32 ColorFromArtificial(double artificial)
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

    public static string BortleFromSqm(double sqm)
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

    public static int ParseBortleLevel(string label)
    {
        var match = Regex.Match(label ?? string.Empty, @"class\s*(\d+)", RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var value) ? value : 9;
    }

    public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
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

    public static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180d;
    }

    public static double RoundTo(double value, int decimals)
    {
        var factor = Math.Pow(10d, decimals);
        return Math.Round(value * factor) / factor;
    }

    public static double Clamp(double value, double min, double max)
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

    public static int ClampToInt(int value, int min, int max)
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
}
