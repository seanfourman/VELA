using System.Text.Json.Serialization;

namespace Vela.Api.DTOs;

public sealed class SkyQualityResponseDto
{
    [JsonPropertyName("Coordinates")]
    public double[] Coordinates { get; set; } = [];

    [JsonPropertyName("SQM")]
    public double SQM { get; set; }

    [JsonPropertyName("Brightness_mcd_m2")]
    public double BrightnessMcdM2 { get; set; }

    [JsonPropertyName("Artif_bright_uccd_m2")]
    public int ArtificialBrightnessUccdM2 { get; set; }

    [JsonPropertyName("Ratio")]
    public double Ratio { get; set; }

    [JsonPropertyName("Bortle")]
    public string Bortle { get; set; } = string.Empty;
}

public sealed class DarkSpotOriginDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }
}

public sealed class DarkSpotDto
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }

    [JsonPropertyName("level")]
    public int Level { get; set; }

    [JsonPropertyName("light_value")]
    public double LightValue { get; set; }

    [JsonPropertyName("sqm")]
    public double Sqm { get; set; }

    [JsonPropertyName("distance_km")]
    public double DistanceKm { get; set; }
}

public sealed class DarkSpotsResponseDto
{
    [JsonPropertyName("origin")]
    public DarkSpotOriginDto Origin { get; set; } = new();

    [JsonPropertyName("radius_km")]
    public double RadiusKm { get; set; }

    [JsonPropertyName("spots")]
    public List<DarkSpotDto> Spots { get; set; } = [];
}
