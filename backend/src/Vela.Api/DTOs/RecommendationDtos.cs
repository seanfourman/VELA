using System.Text.Json.Serialization;

namespace Vela.Api.DTOs;

public class CoordinatesDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }
}

public class RecommendationDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("region")]
    public string? Region { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("best_time")]
    public string? BestTime { get; set; }

    [JsonPropertyName("coordinates")]
    public CoordinatesDto Coordinates { get; set; } = new();

    [JsonPropertyName("photo_urls")]
    public List<string> PhotoUrls { get; set; } = [];

    [JsonPropertyName("source_urls")]
    public List<string> SourceUrls { get; set; } = [];
}

public class UpsertRecommendationRequestDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("region")]
    public string? Region { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("best_time")]
    public string? BestTime { get; set; }

    [JsonPropertyName("coordinates")]
    public CoordinatesDto Coordinates { get; set; } = new();

    [JsonPropertyName("photo_urls")]
    public List<string>? PhotoUrls { get; set; }

    [JsonPropertyName("source_urls")]
    public List<string>? SourceUrls { get; set; }
}
