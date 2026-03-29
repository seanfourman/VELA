using System.Data;
using System.Data.SqlClient;
using System.Text.Json;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public class StarPartyEventService : DBService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public List<StarPartyEventDto> GetAllEvents()
    {
        var events = new List<StarPartyEventDto>();
        SqlConnection? con = null;
        try
        {
            con = Connect();
            SqlCommand cmd = CreateCommand("SP_GetAllStarPartyEvents", con, new Dictionary<string, object>());
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    events.Add(MapReaderToEvent(reader));
                }
            }
            return events;
        }
        finally { con?.Close(); }
    }

    public StarPartyEventDto UpsertEvent(UpsertStarPartyEventRequestDto request, User hostUser)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            // Checklist data is persisted as JSON so the event row can stay mostly flat.
            var parameters = new Dictionary<string, object>
            {
                { "@Id", request.Id!.Trim() },
                { "@Title", request.Title.Trim() },
                { "@EventType", request.EventType ?? "party" },
                { "@Status", request.Status ?? "draft" },
                { "@StartsAtUtc", request.StartsAt },
                { "@EndsAtUtc", request.EndsAt.HasValue ? request.EndsAt.Value : DBNull.Value },
                { "@Lat", request.Lat },
                { "@Lon", request.Lng },
                { "@MeetupDetails", EmptyAsNull(request.MeetupDetails) },
                { "@Description", EmptyAsNull(request.Description) },
                { "@HostChecklistJson", SerializeChecklist(request.HostChecklist) },
                { "@HostUserId", hostUser.Id },
                { "@HostName", hostUser.Name.Trim() },
                { "@HostEmail", hostUser.Email.Trim().ToLowerInvariant() },
                { "@UpdatedAtUtc", DateTime.UtcNow },
            };
            SqlCommand cmd = CreateCommand("SP_UpsertStarPartyEvent", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read()) return MapReaderToEvent(reader);
            }
            // Fall back to a normalized DTO if the stored procedure completes without returning a row.
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
                Host = new StarPartyHostDto { Id = hostUser.Id.ToString(), Name = hostUser.Name, Email = hostUser.Email },
                Rsvps = [],
            };
        }
        finally { con?.Close(); }
    }

    public StarPartyEventDto? SetStatus(string eventId, string status)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@Id", eventId.Trim() },
                { "@Status", status.Trim().ToLowerInvariant() },
                { "@UpdatedAtUtc", DateTime.UtcNow },
            };
            SqlCommand cmd = CreateCommand("SP_SetStarPartyEventStatus", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read()) return MapReaderToEvent(reader);
            }
            return null;
        }
        finally { con?.Close(); }
    }

    public bool DeleteEvent(string eventId)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            SqlCommand cmd = CreateCommand("SP_DeleteStarPartyEvent", con,
                new Dictionary<string, object> { { "@Id", eventId.Trim() } });
            var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(affectedRowsParam);
            cmd.ExecuteNonQuery();
            return Convert.ToInt32(affectedRowsParam.Value) > 0;
        }
        finally { con?.Close(); }
    }

    public (StarPartyEventDto? Event, bool Joined) ToggleRsvp(string eventId, User user)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@EventId", eventId.Trim() },
                { "@UserId", user.Id },
                { "@UserName", user.Name.Trim() },
                { "@UserEmail", user.Email.Trim().ToLowerInvariant() },
            };
            SqlCommand cmd = CreateCommand("SP_ToggleStarPartyRsvp", con, parameters);
            var joinedParam = new SqlParameter("@Joined", SqlDbType.Bit) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(joinedParam);

            StarPartyEventDto? updatedEvent = null;
            using (var reader = cmd.ExecuteReader())
            {
                updatedEvent = reader.Read() ? MapReaderToEvent(reader) : null;
            }

            var joined = joinedParam.Value != DBNull.Value && Convert.ToBoolean(joinedParam.Value);
            return (updatedEvent, joined);
        }
        finally { con?.Close(); }
    }

    private static StarPartyEventDto MapReaderToEvent(SqlDataReader reader)
    {
        return new StarPartyEventDto
        {
            Id = reader["Id"].ToString() ?? string.Empty,
            Title = reader["Title"].ToString() ?? string.Empty,
            EventType = reader["EventType"].ToString() ?? "party",
            Status = reader["Status"].ToString() ?? "draft",
            StartsAt = Convert.ToDateTime(reader["StartsAtUtc"]),
            EndsAt = reader["EndsAtUtc"] == DBNull.Value ? null : Convert.ToDateTime(reader["EndsAtUtc"]),
            Lat = Convert.ToDouble(reader["Lat"]),
            Lng = Convert.ToDouble(reader["Lon"]),
            MeetupDetails = reader["MeetupDetails"] == DBNull.Value ? null : reader["MeetupDetails"].ToString(),
            Description = reader["Description"] == DBNull.Value ? null : reader["Description"].ToString(),
            HostChecklist = DeserializeList(reader["HostChecklistJson"] == DBNull.Value ? null : reader["HostChecklistJson"].ToString()),
            Host = BuildHost(reader),
            Rsvps = DeserializeRsvps(reader["RsvpsJson"] == DBNull.Value ? null : reader["RsvpsJson"].ToString()),
            CreatedAt = Convert.ToDateTime(reader["CreatedAtUtc"]),
            UpdatedAt = Convert.ToDateTime(reader["UpdatedAtUtc"]),
        };
    }

    private static StarPartyHostDto? BuildHost(SqlDataReader reader)
    {
        var hostId = reader["HostUserId"] == DBNull.Value ? string.Empty : reader["HostUserId"].ToString();
        var hostName = reader["HostName"] == DBNull.Value ? string.Empty : reader["HostName"].ToString();
        var hostEmail = reader["HostEmail"] == DBNull.Value ? string.Empty : reader["HostEmail"].ToString();
        if (string.IsNullOrWhiteSpace(hostId) && string.IsNullOrWhiteSpace(hostName)) return null;
        return new StarPartyHostDto { Id = hostId ?? string.Empty, Name = hostName ?? string.Empty, Email = hostEmail ?? string.Empty };
    }

    private static string SerializeChecklist(IEnumerable<string>? checklist)
    {
        return JsonSerializer.Serialize(NormalizeChecklist(checklist), JsonOptions);
    }

    private static List<string> NormalizeChecklist(IEnumerable<string>? checklist)
    {
        // Normalize before serialization so duplicates and blank items do not get stored.
        return (checklist ?? [])
            .Select(v => (v ?? string.Empty).Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(24)
            .ToList();
    }

    private static List<string> DeserializeList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return NormalizeChecklist(JsonSerializer.Deserialize<List<string>>(json, JsonOptions)); }
        catch { return []; }
    }

    private static List<StarPartyRsvpDto> DeserializeRsvps(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var list = JsonSerializer.Deserialize<List<StarPartyRsvpDto>>(json, JsonOptions);
            // Older rows may contain partial RSVP snapshots, so sanitize the shape on read.
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
        catch { return []; }
    }

    private static object EmptyAsNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value.Trim();
    }
}
