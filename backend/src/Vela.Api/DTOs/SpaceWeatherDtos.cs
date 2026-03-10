using System.Text.Json;
using System.Text.Json.Serialization;

namespace Vela.Api.DTOs;

public sealed class SpaceWeatherWindowDto
{
    [JsonPropertyName("gstStartDate")]
    public string GstStartDate { get; set; } = string.Empty;

    [JsonPropertyName("cmeStartDate")]
    public string CmeStartDate { get; set; } = string.Empty;

    [JsonPropertyName("endDate")]
    public string EndDate { get; set; } = string.Empty;
}

public sealed class SpaceWeatherRawSnapshotDto
{
    [JsonPropertyName("fetchedAt")]
    public DateTime FetchedAt { get; set; }

    [JsonPropertyName("apiKeyMode")]
    public string ApiKeyMode { get; set; } = "demo";

    [JsonPropertyName("window")]
    public SpaceWeatherWindowDto Window { get; set; } = new();

    [JsonPropertyName("gstRaw")]
    public JsonElement GstRaw { get; set; } = JsonSerializer.SerializeToElement(
        Array.Empty<object>()
    );

    [JsonPropertyName("cmeRaw")]
    public JsonElement CmeRaw { get; set; } = JsonSerializer.SerializeToElement(
        Array.Empty<object>()
    );
}
