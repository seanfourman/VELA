using System.Data;
using System.Data.SqlClient;
using System.Text.Json;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public sealed class SqlStarPartyEventRepository : IStarPartyEventRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly ISqlConnectionFactory _connectionFactory;

    public SqlStarPartyEventRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public List<StarPartyEventDto> GetAllEvents()
    {
        var events = new List<StarPartyEventDto>();

        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetAllStarPartyEvents",
            connection,
            new Dictionary<string, object>()
        );
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            events.Add(MapReaderToEvent(reader));
        }

        return events;
    }

    public StarPartyEventDto UpsertEvent(UpsertStarPartyEventRequestDto request, User hostUser)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_UpsertStarPartyEvent",
            connection,
            new Dictionary<string, object>
            {
                { "@Id", request.Id!.Trim() },
                { "@Title", request.Title.Trim() },
                { "@EventType", request.EventType ?? "party" },
                { "@Status", request.Status ?? "draft" },
                { "@StartsAtUtc", request.StartsAt },
                {
                    "@EndsAtUtc",
                    request.EndsAt.HasValue ? request.EndsAt.Value : DBNull.Value
                },
                { "@Lat", request.Lat },
                { "@Lon", request.Lng },
                { "@MeetupDetails", EmptyAsNull(request.MeetupDetails) },
                { "@Description", EmptyAsNull(request.Description) },
                { "@HostChecklistJson", SerializeChecklist(request.HostChecklist) },
                { "@HostUserId", hostUser.Id },
                { "@HostName", hostUser.Name.Trim() },
                { "@HostEmail", hostUser.Email.Trim().ToLowerInvariant() },
                { "@UpdatedAtUtc", DateTime.UtcNow },
            }
        );
        using var reader = command.ExecuteReader();
        if (reader.Read())
        {
            return MapReaderToEvent(reader);
        }

        return new StarPartyEventDto
        {
            Id = request.Id!.Trim(),
            Title = request.Title.Trim(),
            EventType = request.EventType ?? "party",
            Status = request.Status ?? "draft",
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            Lat = request.Lat,
            Lng = request.Lng,
            MeetupDetails = request.MeetupDetails,
            Description = request.Description,
            HostChecklist = NormalizeChecklist(request.HostChecklist),
            Host = new StarPartyHostDto
            {
                Id = hostUser.Id.ToString(),
                Name = hostUser.Name,
                Email = hostUser.Email,
            },
            Rsvps = [],
        };
    }

    public StarPartyEventDto? SetStatus(string eventId, string status)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_SetStarPartyEventStatus",
            connection,
            new Dictionary<string, object>
            {
                { "@Id", eventId.Trim() },
                { "@Status", status.Trim().ToLowerInvariant() },
                { "@UpdatedAtUtc", DateTime.UtcNow },
            }
        );
        using var reader = command.ExecuteReader();
        return reader.Read() ? MapReaderToEvent(reader) : null;
    }

    public bool DeleteEvent(string eventId)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_DeleteStarPartyEvent",
            connection,
            new Dictionary<string, object> { { "@Id", eventId.Trim() } }
        );
        var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int)
        {
            Direction = ParameterDirection.Output,
        };
        command.Parameters.Add(affectedRowsParam);
        command.ExecuteNonQuery();
        return Convert.ToInt32(affectedRowsParam.Value) > 0;
    }

    public (StarPartyEventDto? Event, bool Joined) ToggleRsvp(string eventId, User user)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_ToggleStarPartyRsvp",
            connection,
            new Dictionary<string, object>
            {
                { "@EventId", eventId.Trim() },
                { "@UserId", user.Id },
                { "@UserName", user.Name.Trim() },
                { "@UserEmail", user.Email.Trim().ToLowerInvariant() },
            }
        );
        var joinedParam = new SqlParameter("@Joined", SqlDbType.Bit)
        {
            Direction = ParameterDirection.Output,
        };
        command.Parameters.Add(joinedParam);

        StarPartyEventDto? updatedEvent = null;
        using (var reader = command.ExecuteReader())
        {
            updatedEvent = reader.Read() ? MapReaderToEvent(reader) : null;
        }

        var joined = joinedParam.Value != DBNull.Value && Convert.ToBoolean(joinedParam.Value);
        return (updatedEvent, joined);
    }

    private static StarPartyEventDto MapReaderToEvent(SqlDataReader reader)
    {
        var host = BuildHost(reader);
        return new StarPartyEventDto
        {
            Id = reader["Id"].ToString() ?? string.Empty,
            Title = reader["Title"].ToString() ?? string.Empty,
            EventType = reader["EventType"].ToString() ?? "party",
            Status = reader["Status"].ToString() ?? "draft",
            StartsAt = Convert.ToDateTime(reader["StartsAtUtc"]),
            EndsAt = reader["EndsAtUtc"] == DBNull.Value
                ? null
                : Convert.ToDateTime(reader["EndsAtUtc"]),
            Lat = Convert.ToDouble(reader["Lat"]),
            Lng = Convert.ToDouble(reader["Lon"]),
            MeetupDetails = reader["MeetupDetails"] == DBNull.Value
                ? null
                : reader["MeetupDetails"].ToString(),
            Description = reader["Description"] == DBNull.Value
                ? null
                : reader["Description"].ToString(),
            HostChecklist = DeserializeList(
                reader["HostChecklistJson"] == DBNull.Value
                    ? null
                    : reader["HostChecklistJson"].ToString()
            ),
            Host = host,
            Rsvps = DeserializeRsvps(
                reader["RsvpsJson"] == DBNull.Value ? null : reader["RsvpsJson"].ToString()
            ),
            CreatedAt = Convert.ToDateTime(reader["CreatedAtUtc"]),
            UpdatedAt = Convert.ToDateTime(reader["UpdatedAtUtc"]),
        };
    }

    private static StarPartyHostDto? BuildHost(SqlDataReader reader)
    {
        var hostId = reader["HostUserId"] == DBNull.Value ? string.Empty : reader["HostUserId"].ToString();
        var hostName = reader["HostName"] == DBNull.Value ? string.Empty : reader["HostName"].ToString();
        var hostEmail = reader["HostEmail"] == DBNull.Value ? string.Empty : reader["HostEmail"].ToString();

        if (string.IsNullOrWhiteSpace(hostId) && string.IsNullOrWhiteSpace(hostName))
        {
            return null;
        }

        return new StarPartyHostDto
        {
            Id = hostId ?? string.Empty,
            Name = hostName ?? string.Empty,
            Email = hostEmail ?? string.Empty,
        };
    }

    private static string SerializeChecklist(IEnumerable<string>? checklist)
    {
        return JsonSerializer.Serialize(NormalizeChecklist(checklist), JsonOptions);
    }

    private static List<string> NormalizeChecklist(IEnumerable<string>? checklist)
    {
        return (checklist ?? [])
            .Select(value => (value ?? string.Empty).Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(24)
            .ToList();
    }

    private static List<string> DeserializeList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
            return NormalizeChecklist(list);
        }
        catch
        {
            return [];
        }
    }

    private static List<StarPartyRsvpDto> DeserializeRsvps(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            var list = JsonSerializer.Deserialize<List<StarPartyRsvpDto>>(json, JsonOptions);
            return (list ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.UserId))
                .Select(item => new StarPartyRsvpDto
                {
                    UserId = item.UserId.Trim().ToLowerInvariant(),
                    Name = string.IsNullOrWhiteSpace(item.Name) ? "Explorer" : item.Name.Trim(),
                    Email = string.IsNullOrWhiteSpace(item.Email) ? null : item.Email.Trim(),
                    JoinedAt = item.JoinedAt == default ? DateTime.UtcNow : item.JoinedAt,
                })
                .ToList();
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
