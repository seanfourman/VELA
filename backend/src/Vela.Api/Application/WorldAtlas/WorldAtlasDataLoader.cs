using System.Globalization;
using System.Text.Json;
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

        // Convert image space to real world coordinates using the tie point and pixel scale:
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

    public Geometry LoadLandGeometry()
    {
        var landMaskPath = ResolveLandMaskPath();
        var json = File.ReadAllText(landMaskPath);
        return ReadRootGeometry(json);
    }

    public IPreparedGeometry LoadLandMask()
    {
        return PreparedGeometryFactory.Prepare(LoadLandGeometry());
    }

    public IReadOnlyList<CountryBoundary> LoadCountryBoundaries()
    {
        var countryBoundariesPath = ResolveCountryBoundariesPath();
        var json = File.ReadAllText(countryBoundariesPath);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (!root.TryGetProperty("features", out var featuresElement) || featuresElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("The country boundaries dataset must be a GeoJSON FeatureCollection.");
        }

        var reader = new GeoJsonReader();
        var boundaries = new List<CountryBoundary>();

        foreach (var feature in featuresElement.EnumerateArray())
        {
            var geometry = ReadFeatureGeometry(feature, reader);
            var countryCode = ReadCountryCode(feature);
            var countryName = ReadCountryName(feature);

            boundaries.Add(
                new CountryBoundary(
                    countryCode,
                    countryName,
                    geometry,
                    PreparedGeometryFactory.Prepare(geometry)
                )
            );
        }

        if (boundaries.Count == 0)
        {
            throw new InvalidOperationException("The country boundaries dataset has no features.");
        }

        return boundaries;
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

    private string ResolveCountryBoundariesPath()
    {
        var configured = _configuration["WorldAtlas:CountryBoundariesPath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            var resolved = ResolvePath(configured);
            if (File.Exists(resolved))
            {
                return resolved;
            }
        }

        var bundled = Path.Combine(_environment.ContentRootPath, "Data", "countries-10m.geojson");
        if (File.Exists(bundled))
        {
            return bundled;
        }

        throw new FileNotFoundException("countries-10m.geojson was not found for the backend country boundaries.");
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

    private static Geometry ReadRootGeometry(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (TryGetType(root, out var rootType) && string.Equals(rootType, "FeatureCollection", StringComparison.Ordinal))
        {
            return ReadFeatureCollectionGeometry(root);
        }

        if (TryGetType(root, out rootType) && string.Equals(rootType, "Feature", StringComparison.Ordinal))
        {
            return ReadFeatureGeometry(root, new GeoJsonReader());
        }

        return new GeoJsonReader().Read<Geometry>(json)
            ?? throw new InvalidOperationException("Could not parse the GeoJSON geometry.");
    }

    private static Geometry ReadFeatureCollectionGeometry(JsonElement root)
    {
        if (!root.TryGetProperty("features", out var featuresElement) || featuresElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("The GeoJSON FeatureCollection is missing features.");
        }

        var reader = new GeoJsonReader();
        var geometries = new List<Geometry>();

        foreach (var feature in featuresElement.EnumerateArray())
        {
            geometries.Add(ReadFeatureGeometry(feature, reader));
        }

        if (geometries.Count == 0)
        {
            throw new InvalidOperationException("The GeoJSON FeatureCollection has no geometries.");
        }

        return GeometryFactory.Default.BuildGeometry(geometries);
    }

    private static Geometry ReadFeatureGeometry(JsonElement feature, GeoJsonReader reader)
    {
        if (!feature.TryGetProperty("geometry", out var geometryElement))
        {
            throw new InvalidOperationException("A GeoJSON feature is missing geometry.");
        }

        return reader.Read<Geometry>(geometryElement.GetRawText())
            ?? throw new InvalidOperationException("Could not parse a GeoJSON feature geometry.");
    }

    private static string ReadCountryCode(JsonElement feature)
    {
        return ReadFeatureProperty(feature, "ADM0_A3")
            ?? ReadFeatureProperty(feature, "ADM0_A3_US")
            ?? ReadFeatureProperty(feature, "ISO_A3_EH")
            ?? ReadFeatureProperty(feature, "ISO_A3")
            ?? ReadFeatureProperty(feature, "SOV_A3")
            ?? throw new InvalidOperationException("A country boundary feature is missing a country code.");
    }

    private static string ReadCountryName(JsonElement feature)
    {
        return ReadFeatureProperty(feature, "NAME_EN")
            ?? ReadFeatureProperty(feature, "NAME_LONG")
            ?? ReadFeatureProperty(feature, "NAME")
            ?? ReadFeatureProperty(feature, "ADMIN")
            ?? "Unknown";
    }

    private static string? ReadFeatureProperty(JsonElement feature, string propertyName)
    {
        if (!feature.TryGetProperty("properties", out var propertiesElement)
            || propertiesElement.ValueKind != JsonValueKind.Object
            || !propertiesElement.TryGetProperty(propertyName, out var propertyElement))
        {
            return null;
        }

        if (propertyElement.ValueKind == JsonValueKind.String)
        {
            var value = propertyElement.GetString();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }

        if (propertyElement.ValueKind == JsonValueKind.Number)
        {
            return propertyElement.ToString();
        }

        return null;
    }

    private static bool TryGetType(JsonElement element, out string? type)
    {
        if (element.TryGetProperty("type", out var typeElement) && typeElement.ValueKind == JsonValueKind.String)
        {
            type = typeElement.GetString();
            return !string.IsNullOrWhiteSpace(type);
        }

        type = null;
        return false;
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
