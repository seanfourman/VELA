using System.Data.SqlClient;
using System.Text.Json;
using Vela.Api.BL;
using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public class RecommendationService : DBService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static RecommendationDto MapReaderToRecommendation(SqlDataReader reader)
    {
        return new RecommendationDto
        {
            Id = reader["Id"].ToString() ?? string.Empty,
            Name = reader["Name"].ToString() ?? string.Empty,
            Country = reader["Country"] == DBNull.Value ? null : reader["Country"].ToString(),
            Region = reader["Region"] == DBNull.Value ? null : reader["Region"].ToString(),
            Type = reader["Type"] == DBNull.Value ? null : reader["Type"].ToString(),
            Description = reader["Description"] == DBNull.Value
                ? null
                : reader["Description"].ToString(),
            BestTime = reader["BestTime"] == DBNull.Value ? null : reader["BestTime"].ToString(),
            Coordinates = new CoordinatesDto
            {
                Lat = Convert.ToDouble(reader["Lat"]),
                Lon = Convert.ToDouble(reader["Lon"])
            },
            PhotoUrls = DeserializeUrlList(
                reader["PhotoUrlsJson"] == DBNull.Value ? null : reader["PhotoUrlsJson"].ToString()
            ),
            SourceUrls = DeserializeUrlList(
                reader["SourceUrlsJson"] == DBNull.Value
                    ? null
                    : reader["SourceUrlsJson"].ToString()
            )
        };
    }

    public List<RecommendationDto> GetAll()
    {
        var recommendations = new List<RecommendationDto>();
        SqlConnection? con = null;

        try
        {
            con = Connect();
            var sql = @"
SELECT Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
FROM Recommendations
ORDER BY Name;";

            var cmd = CreateTextCommand(sql, con, null);
            using var reader = cmd.ExecuteReader();

            while (reader.Read())
            {
                recommendations.Add(MapReaderToRecommendation(reader));
            }

            return recommendations;
        }
        finally
        {
            con?.Close();
        }
    }

    public RecommendationDto SaveRecommendation(UpsertRecommendationRequestDto request)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();

            var id = string.IsNullOrWhiteSpace(request.Id)
                ? Recommendation.BuildLocationId(
                    request.Name,
                    request.Coordinates.Lat,
                    request.Coordinates.Lon
                )
                : request.Id.Trim();

            var selectSql = "SELECT COUNT(1) FROM Recommendations WHERE Id = @Id;";
            var selectCmd = CreateTextCommand(
                selectSql,
                con,
                new Dictionary<string, object> { { "@Id", id } }
            );
            var exists = Convert.ToInt32(selectCmd.ExecuteScalar()) > 0;

            if (exists)
            {
                var updateSql = @"
UPDATE Recommendations
SET Name = @Name,
    Country = @Country,
    Region = @Region,
    [Type] = @Type,
    Description = @Description,
    BestTime = @BestTime,
    Lat = @Lat,
    Lon = @Lon,
    PhotoUrlsJson = @PhotoUrlsJson,
    SourceUrlsJson = @SourceUrlsJson,
    UpdatedAtUtc = @UpdatedAtUtc
WHERE Id = @Id;";

                var updateCmd = CreateTextCommand(updateSql, con, BuildUpsertParameters(id, request));
                updateCmd.ExecuteNonQuery();
            }
            else
            {
                var insertSql = @"
INSERT INTO Recommendations
(
    Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon,
    PhotoUrlsJson, SourceUrlsJson, CreatedAtUtc, UpdatedAtUtc
)
VALUES
(
    @Id, @Name, @Country, @Region, @Type, @Description, @BestTime, @Lat, @Lon,
    @PhotoUrlsJson, @SourceUrlsJson, @CreatedAtUtc, @UpdatedAtUtc
);";

                var insertParams = BuildUpsertParameters(id, request);
                insertParams.Add("@CreatedAtUtc", DateTime.UtcNow);
                var insertCmd = CreateTextCommand(insertSql, con, insertParams);
                insertCmd.ExecuteNonQuery();
            }

            var getSql = @"
SELECT TOP 1 Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
FROM Recommendations
WHERE Id = @Id;";

            var getCmd = CreateTextCommand(
                getSql,
                con,
                new Dictionary<string, object> { { "@Id", id } }
            );
            using var reader = getCmd.ExecuteReader();
            return reader.Read()
                ? MapReaderToRecommendation(reader)
                : new RecommendationDto
                {
                    Id = id,
                    Name = request.Name.Trim(),
                    Country = request.Country?.Trim(),
                    Region = request.Region?.Trim(),
                    Type = request.Type?.Trim(),
                    Description = request.Description?.Trim(),
                    BestTime = request.BestTime?.Trim(),
                    Coordinates = new CoordinatesDto
                    {
                        Lat = request.Coordinates.Lat,
                        Lon = request.Coordinates.Lon
                    },
                    PhotoUrls = NormalizeUrlList(request.PhotoUrls),
                    SourceUrls = NormalizeUrlList(request.SourceUrls)
                };
        }
        finally
        {
            con?.Close();
        }
    }

    public bool DeleteRecommendation(string id)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var sql = "DELETE FROM Recommendations WHERE Id = @Id;";
            var cmd = CreateTextCommand(
                sql,
                con,
                new Dictionary<string, object> { { "@Id", id.Trim() } }
            );
            return cmd.ExecuteNonQuery() > 0;
        }
        finally
        {
            con?.Close();
        }
    }

    public void SeedRecommendationsFromFileIfEmpty(string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return;
        }

        SqlConnection? con = null;
        try
        {
            con = Connect();
            var countCmd = CreateTextCommand("SELECT COUNT(1) FROM Recommendations;", con, null);
            var hasRows = Convert.ToInt32(countCmd.ExecuteScalar()) > 0;
            if (hasRows)
            {
                return;
            }

            var rawJson = File.ReadAllText(filePath);
            using var doc = JsonDocument.Parse(rawJson);
            if (
                !doc.RootElement.TryGetProperty("locations", out var locationsNode)
                || locationsNode.ValueKind != JsonValueKind.Array
            )
            {
                return;
            }

            foreach (var locationNode in locationsNode.EnumerateArray())
            {
                var request = ParseSeedLocation(locationNode);
                if (request == null)
                {
                    continue;
                }

                var id = Recommendation.BuildLocationId(
                    request.Name,
                    request.Coordinates.Lat,
                    request.Coordinates.Lon
                );

                var insertSql = @"
INSERT INTO Recommendations
(
    Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon,
    PhotoUrlsJson, SourceUrlsJson, CreatedAtUtc, UpdatedAtUtc
)
VALUES
(
    @Id, @Name, @Country, @Region, @Type, @Description, @BestTime, @Lat, @Lon,
    @PhotoUrlsJson, @SourceUrlsJson, @CreatedAtUtc, @UpdatedAtUtc
);";

                var parameters = BuildUpsertParameters(id, request);
                parameters.Add("@CreatedAtUtc", DateTime.UtcNow);
                var cmd = CreateTextCommand(insertSql, con, parameters);
                cmd.ExecuteNonQuery();
            }
        }
        catch
        {
            // Seeding should never break API boot.
        }
        finally
        {
            con?.Close();
        }
    }

    private static Dictionary<string, object> BuildUpsertParameters(
        string id,
        UpsertRecommendationRequestDto request
    )
    {
        return new Dictionary<string, object>
        {
            { "@Id", id },
            { "@Name", request.Name.Trim() },
            { "@Country", EmptyAsNull(request.Country) },
            { "@Region", EmptyAsNull(request.Region) },
            { "@Type", EmptyAsNull(request.Type) },
            { "@Description", EmptyAsNull(request.Description) },
            { "@BestTime", EmptyAsNull(request.BestTime) },
            { "@Lat", request.Coordinates.Lat },
            { "@Lon", request.Coordinates.Lon },
            { "@PhotoUrlsJson", SerializeUrlList(request.PhotoUrls) },
            { "@SourceUrlsJson", SerializeUrlList(request.SourceUrls) },
            { "@UpdatedAtUtc", DateTime.UtcNow }
        };
    }

    private static UpsertRecommendationRequestDto? ParseSeedLocation(JsonElement locationNode)
    {
        var name = ReadString(locationNode, "name");
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        if (
            !locationNode.TryGetProperty("coordinates", out var coordinatesNode)
            || coordinatesNode.ValueKind != JsonValueKind.Object
        )
        {
            return null;
        }

        var lat = ReadDouble(coordinatesNode, "lat");
        var lon = ReadDouble(coordinatesNode, "lon");
        if (!double.IsFinite(lat) || !double.IsFinite(lon))
        {
            return null;
        }

        return new UpsertRecommendationRequestDto
        {
            Name = name,
            Country = ReadString(locationNode, "country"),
            Region = ReadString(locationNode, "region"),
            Type = ReadString(locationNode, "type"),
            Description = ReadString(locationNode, "description"),
            BestTime = ReadString(locationNode, "best_time"),
            Coordinates = new CoordinatesDto { Lat = lat, Lon = lon },
            PhotoUrls = ReadStringArray(locationNode, "photo_urls"),
            SourceUrls = ReadStringArray(locationNode, "source_urls")
        };
    }

    private static string? ReadString(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static double ReadDouble(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var value))
        {
            return double.NaN;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var asNumber))
        {
            return asNumber;
        }

        if (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), out asNumber))
        {
            return asNumber;
        }

        return double.NaN;
    }

    private static List<string> ReadStringArray(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return value
            .EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString()?.Trim() ?? string.Empty)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
    }

    private static string SerializeUrlList(IEnumerable<string>? urls)
    {
        var normalized = NormalizeUrlList(urls);
        return JsonSerializer.Serialize(normalized, JsonOptions);
    }

    private static List<string> NormalizeUrlList(IEnumerable<string>? urls)
    {
        return (urls ?? [])
            .Select(url => (url ?? string.Empty).Trim())
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
    }

    private static List<string> DeserializeUrlList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            return NormalizeUrlList(list);
        }
        catch
        {
            return [];
        }
    }

    private static object EmptyAsNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value.Trim();
    }
}
