using System.Globalization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;

namespace Vela.Api.Application;

public sealed class VisiblePlanetsService : IVisiblePlanetsService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _memoryCache;

    public VisiblePlanetsService(
        HttpClient httpClient,
        IConfiguration configuration,
        IMemoryCache memoryCache
    )
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _memoryCache = memoryCache;
    }

    public async Task<VisiblePlanetsProxyResponse> GetAsync(
        double lat,
        double lon,
        CancellationToken cancellationToken = default
    )
    {
        var cacheKey =
            $"visible-planets:{lat.ToString("F5", CultureInfo.InvariantCulture)}:{lon.ToString("F5", CultureInfo.InvariantCulture)}";
        if (_memoryCache.TryGetValue(cacheKey, out VisiblePlanetsProxyResponse? cached) && cached is not null)
        {
            return cached;
        }

        var upstreamUrl = BuildUpstreamUrl(lat, lon);
        using var response = await _httpClient.GetAsync(upstreamUrl, cancellationToken);
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(message)
                    ? $"Visible planets request failed ({(int)response.StatusCode})"
                    : message
            );
        }

        var payload = new VisiblePlanetsProxyResponse
        {
            Content = bytes,
            ContentType =
                response.Content.Headers.ContentType?.ToString()
                ?? "application/json; charset=utf-8",
            CacheControl = response.Headers.CacheControl?.ToString() ?? "public, max-age=600",
        };

        _memoryCache.Set(cacheKey, payload, CacheDuration);
        return payload;
    }

    private string BuildUpstreamUrl(double lat, double lon)
    {
        var baseUrl =
            _configuration["VisiblePlanets:BaseUrl"]?.Trim().TrimEnd('/')
            ?? "https://api.visibleplanets.dev/v3";

        var query = new Dictionary<string, string>
        {
            ["latitude"] = lat.ToString("G17", CultureInfo.InvariantCulture),
            ["longitude"] = lon.ToString("G17", CultureInfo.InvariantCulture),
        };

        return QueryHelpers.AddQueryString(baseUrl, query!);
    }
}
