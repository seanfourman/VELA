using System.Text.Json.Serialization;

namespace Vela.Api.DTOs;

public class FavoriteSpotDto
{
    [JsonPropertyName("spotId")]
    public string SpotId { get; set; } = string.Empty;

    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("customName")]
    public string? CustomName { get; set; }
}

public class CreateFavoriteRequestDto
{
    [JsonPropertyName("spotId")]
    public string? SpotId { get; set; }

    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }

    [JsonPropertyName("customName")]
    public string? CustomName { get; set; }
}

public class UpdateFavoriteRequestDto
{
    [JsonPropertyName("customName")]
    public string? CustomName { get; set; }
}
