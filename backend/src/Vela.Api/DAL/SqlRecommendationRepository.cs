using System.Data;
using System.Data.SqlClient;
using System.Text.Json;
using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public sealed class SqlRecommendationRepository : IRecommendationRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly ISqlConnectionFactory _connectionFactory;

    public SqlRecommendationRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public List<RecommendationDto> GetAll()
    {
        var recommendations = new List<RecommendationDto>();

        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetAllRecommendations",
            connection,
            new Dictionary<string, object>()
        );
        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            recommendations.Add(MapReaderToRecommendation(reader));
        }

        return recommendations;
    }

    public RecommendationDto SaveRecommendation(string id, UpsertRecommendationRequestDto request)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_UpsertRecommendation",
            connection,
            BuildUpsertParameters(id, request)
        );
        using var reader = command.ExecuteReader();
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
                    Lon = request.Coordinates.Lon,
                },
                PhotoUrls = NormalizeUrlList(request.PhotoUrls),
                SourceUrls = NormalizeUrlList(request.SourceUrls),
            };
    }

    public bool DeleteRecommendation(string id)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_DeleteRecommendation",
            connection,
            new Dictionary<string, object> { { "@Id", id.Trim() } }
        );
        var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int)
        {
            Direction = ParameterDirection.Output,
        };
        command.Parameters.Add(affectedRowsParam);

        command.ExecuteNonQuery();
        return Convert.ToInt32(affectedRowsParam.Value) > 0;
    }

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
                Lon = Convert.ToDouble(reader["Lon"]),
            },
            PhotoUrls = DeserializeUrlList(
                reader["PhotoUrlsJson"] == DBNull.Value ? null : reader["PhotoUrlsJson"].ToString()
            ),
            SourceUrls = DeserializeUrlList(
                reader["SourceUrlsJson"] == DBNull.Value ? null : reader["SourceUrlsJson"].ToString()
            ),
        };
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
            { "@UpdatedAtUtc", DateTime.UtcNow },
        };
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
