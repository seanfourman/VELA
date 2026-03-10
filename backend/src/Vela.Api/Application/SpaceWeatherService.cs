using System.Text.Json;
using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Vela.Api.DTOs;

namespace Vela.Api.Application;

public sealed class SpaceWeatherService : ISpaceWeatherService
{
    private const string CacheKey = "space-weather:snapshot";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
    private static readonly JsonElement EmptyArray = JsonSerializer.SerializeToElement(
        Array.Empty<object>()
    );

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _memoryCache;

    public SpaceWeatherService(
        HttpClient httpClient,
        IConfiguration configuration,
        IMemoryCache memoryCache
    )
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _memoryCache = memoryCache;
    }

    public async Task<SpaceWeatherRawSnapshotDto> GetSnapshotAsync(
        bool force,
        CancellationToken cancellationToken = default
    )
    {
        if (!force && _memoryCache.TryGetValue(CacheKey, out SpaceWeatherRawSnapshotDto? cached))
        {
            return cached!;
        }

        var snapshot = await FetchSnapshotAsync(cancellationToken);
        _memoryCache.Set(CacheKey, snapshot, CacheDuration);
        return snapshot;
    }

    private async Task<SpaceWeatherRawSnapshotDto> FetchSnapshotAsync(
        CancellationToken cancellationToken
    )
    {
        var now = DateTime.UtcNow;
        var endDate = FormatDate(now);
        var gstStartDate = FormatDate(now.AddDays(-30));
        var cmeStartDate = FormatDate(now.AddDays(-21));
        var apiKey = ResolveApiKey();

        var gstTask = FetchArrayAsync("GST", gstStartDate, endDate, apiKey, cancellationToken);
        var cmeTask = FetchArrayAsync("CME", cmeStartDate, endDate, apiKey, cancellationToken);

        await Task.WhenAll(gstTask, cmeTask);

        return new SpaceWeatherRawSnapshotDto
        {
            FetchedAt = DateTime.UtcNow,
            ApiKeyMode = string.Equals(apiKey, "DEMO_KEY", StringComparison.Ordinal)
                ? "demo"
                : "custom",
            Window = new SpaceWeatherWindowDto
            {
                GstStartDate = gstStartDate,
                CmeStartDate = cmeStartDate,
                EndDate = endDate,
            },
            GstRaw = gstTask.Result,
            CmeRaw = cmeTask.Result,
        };
    }

    private async Task<JsonElement> FetchArrayAsync(
        string path,
        string startDate,
        string endDate,
        string apiKey,
        CancellationToken cancellationToken
    )
    {
        var baseUrl =
            _configuration["Nasa:DonkiBaseUrl"]?.Trim().TrimEnd('/')
            ?? "https://api.nasa.gov/DONKI";
        var requestUrl =
            $"{baseUrl}/{path}?startDate={Uri.EscapeDataString(startDate)}&endDate={Uri.EscapeDataString(endDate)}&api_key={Uri.EscapeDataString(apiKey)}";

        using var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(ReadErrorMessage(payload, response.StatusCode));
        }

        if (string.IsNullOrWhiteSpace(payload))
        {
            return EmptyArray;
        }

        using var document = JsonDocument.Parse(payload);
        return document.RootElement.ValueKind == JsonValueKind.Array
            ? document.RootElement.Clone()
            : EmptyArray;
    }

    private string ResolveApiKey()
    {
        var configured = _configuration["Nasa:ApiKey"];
        return string.IsNullOrWhiteSpace(configured) ? "DEMO_KEY" : configured.Trim();
    }

    private static string FormatDate(DateTime value)
    {
        return value.ToString("yyyy-MM-dd");
    }

    private static string ReadErrorMessage(string payload, HttpStatusCode statusCode)
    {
        if (!string.IsNullOrWhiteSpace(payload))
        {
            try
            {
                using var document = JsonDocument.Parse(payload);
                var root = document.RootElement;
                if (
                    root.TryGetProperty("error", out var errorNode)
                    && errorNode.ValueKind == JsonValueKind.Object
                    && errorNode.TryGetProperty("message", out var nestedMessage)
                    && nestedMessage.ValueKind == JsonValueKind.String
                )
                {
                    return nestedMessage.GetString()
                        ?? $"NASA DONKI request failed ({(int)statusCode})";
                }

                if (
                    root.TryGetProperty("message", out var messageNode)
                    && messageNode.ValueKind == JsonValueKind.String
                )
                {
                    return messageNode.GetString()
                        ?? $"NASA DONKI request failed ({(int)statusCode})";
                }
            }
            catch (JsonException)
            {
                // Ignore malformed error bodies and use the generic fallback.
            }
        }

        return $"NASA DONKI request failed ({(int)statusCode})";
    }
}
