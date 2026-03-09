using System.Text.Json.Serialization;

namespace Vela.Api.DTOs;

public class StarPartyHostDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}

public class StarPartyRsvpDto
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("joinedAt")]
    public DateTime JoinedAt { get; set; }
}

public class StarPartyEventDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "party";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";

    [JsonPropertyName("startsAt")]
    public DateTime StartsAt { get; set; }

    [JsonPropertyName("endsAt")]
    public DateTime? EndsAt { get; set; }

    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lng")]
    public double Lng { get; set; }

    [JsonPropertyName("meetupDetails")]
    public string? MeetupDetails { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("hostChecklist")]
    public List<string> HostChecklist { get; set; } = [];

    [JsonPropertyName("host")]
    public StarPartyHostDto? Host { get; set; }

    [JsonPropertyName("rsvps")]
    public List<StarPartyRsvpDto> Rsvps { get; set; } = [];

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class UpsertStarPartyEventRequestDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("eventType")]
    public string? EventType { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("startsAt")]
    public DateTime StartsAt { get; set; }

    [JsonPropertyName("endsAt")]
    public DateTime? EndsAt { get; set; }

    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lng")]
    public double Lng { get; set; }

    [JsonPropertyName("meetupDetails")]
    public string? MeetupDetails { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("hostChecklist")]
    public List<string>? HostChecklist { get; set; }
}

public class SetStarPartyEventStatusRequestDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class ToggleStarPartyRsvpResponseDto
{
    [JsonPropertyName("event")]
    public StarPartyEventDto? Event { get; set; }

    [JsonPropertyName("joined")]
    public bool Joined { get; set; }

    [JsonPropertyName("rsvpCount")]
    public int RsvpCount { get; set; }
}
