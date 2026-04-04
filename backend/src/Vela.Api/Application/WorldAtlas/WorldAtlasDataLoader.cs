using System.Globalization;
using BitMiracle.LibTiff.Classic;
using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Prepared;
using NetTopologySuite.IO;

namespace Vela.Api.Application;

internal sealed class WorldAtlasDataLoader
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public WorldAtlasDataLoader(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    public AtlasMetadata LoadMetadata()
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

    public IPreparedGeometry LoadLandMask()
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
}
