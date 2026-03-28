using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Vela.Api.Application;

public sealed class MapTilerProxyService
{
    private const string MapTilerHost = "api.maptiler.com";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public MapTilerProxyService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<MapTilerProxyResponse> GetResourceAsync(
        string resourcePath,
        IReadOnlyDictionary<string, string?> query,
        string proxyBaseUrl,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedPath = NormalizeResourcePath(resourcePath);
        var upstreamUrl = BuildUpstreamUrl(normalizedPath, query);

        using var response = await _httpClient.GetAsync(upstreamUrl, cancellationToken);
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorMessage = Encoding.UTF8.GetString(bytes);
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(errorMessage)
                    ? $"MapTiler request failed ({(int)response.StatusCode})"
                    : errorMessage
            );
        }

        var contentType =
            response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
        var contentEncoding = response.Content.Headers.ContentEncoding.FirstOrDefault();
        var cacheControl = response.Headers.CacheControl?.ToString();
        var etag = response.Headers.ETag?.ToString();
        var lastModified = response.Content.Headers.LastModified;

        if (ShouldRewriteJson(normalizedPath, contentType))
        {
            var json = Encoding.UTF8.GetString(bytes);
            var rewritten = RewriteJsonPayload(json, proxyBaseUrl);
            bytes = Encoding.UTF8.GetBytes(rewritten);
            contentType = "application/json; charset=utf-8";
            contentEncoding = null;
            cacheControl = "no-cache";
            etag = null;
            lastModified = null;
        }

        return new MapTilerProxyResponse
        {
            Content = bytes,
            ContentType = contentType,
            CacheControl = cacheControl,
            ETag = etag,
            LastModified = lastModified,
            ContentEncoding = contentEncoding,
        };
    }

    private string BuildUpstreamUrl(string resourcePath, IReadOnlyDictionary<string, string?> query)
    {
        var baseUrl =
            _configuration["MapTiler:BaseUrl"]?.Trim().TrimEnd('/')
            ?? "https://api.maptiler.com";
        var apiKey = ResolveApiKey();
        var builder = new StringBuilder();
        builder.Append(baseUrl);
        builder.Append('/');
        builder.Append(resourcePath);

        var queryValues = new List<string>();
        foreach (var entry in query)
        {
            if (string.Equals(entry.Key, "key", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (entry.Key.StartsWith("_", StringComparison.Ordinal))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(entry.Value))
            {
                continue;
            }

            queryValues.Add(
                $"{Uri.EscapeDataString(entry.Key)}={Uri.EscapeDataString(entry.Value)}"
            );
        }

        queryValues.Add($"key={Uri.EscapeDataString(apiKey)}");

        if (queryValues.Count > 0)
        {
            builder.Append('?');
            builder.Append(string.Join('&', queryValues));
        }

        return builder.ToString();
    }

    private string ResolveApiKey()
    {
        var configured = _configuration["MapTiler:ApiKey"];
        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException(
                "MapTiler:ApiKey is not configured on the backend."
            );
        }

        return configured.Trim();
    }

    private static string NormalizeResourcePath(string resourcePath)
    {
        var normalized = string.Join(
            '/',
            (resourcePath ?? string.Empty)
                .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        );

        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new InvalidOperationException("MapTiler resource path is required.");
        }

        return normalized;
    }

    private static bool ShouldRewriteJson(string resourcePath, string contentType)
    {
        return resourcePath.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
            || contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase);
    }

    private static string RewriteJsonPayload(string payload, string proxyBaseUrl)
    {
        JsonNode? node;
        try
        {
            node = JsonNode.Parse(payload);
        }
        catch (JsonException)
        {
            return payload;
        }

        if (node is null)
        {
            return payload;
        }

        RewriteNode(node, proxyBaseUrl.TrimEnd('/'));
        return node.ToJsonString();
    }

    private static void RewriteNode(JsonNode node, string proxyBaseUrl)
    {
        switch (node)
        {
            case JsonObject jsonObject:
                foreach (var property in jsonObject.ToList())
                {
                    if (property.Value is null)
                    {
                        continue;
                    }

                    if (
                        property.Value is JsonValue jsonValue
                        && jsonValue.TryGetValue<string>(out var stringValue)
                    )
                    {
                        jsonObject[property.Key] = RewriteUrl(stringValue, proxyBaseUrl);
                        continue;
                    }

                    RewriteNode(property.Value, proxyBaseUrl);
                }

                break;

            case JsonArray jsonArray:
                for (var index = 0; index < jsonArray.Count; index += 1)
                {
                    var item = jsonArray[index];
                    if (item is null)
                    {
                        continue;
                    }

                    if (item is JsonValue jsonValue && jsonValue.TryGetValue<string>(out var value))
                    {
                        jsonArray[index] = RewriteUrl(value, proxyBaseUrl);
                        continue;
                    }

                    RewriteNode(item, proxyBaseUrl);
                }

                break;
        }
    }

    private static string RewriteUrl(string value, string proxyBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return value;
        }

        if (!string.Equals(uri.Host, MapTilerHost, StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var queryValues = new List<string>();
        foreach (var queryPart in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separatorIndex = queryPart.IndexOf('=');
            var key = separatorIndex >= 0 ? queryPart[..separatorIndex] : queryPart;
            var rawValue = separatorIndex >= 0 ? queryPart[(separatorIndex + 1)..] : string.Empty;

            if (string.Equals(key, "key", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            queryValues.Add(
                string.IsNullOrEmpty(rawValue)
                    ? Uri.EscapeDataString(Uri.UnescapeDataString(key))
                    : $"{Uri.EscapeDataString(Uri.UnescapeDataString(key))}={Uri.EscapeDataString(Uri.UnescapeDataString(rawValue))}"
            );
        }

        var proxyPath = uri.GetComponents(UriComponents.Path, UriFormat.Unescaped);
        var proxyUrl = $"{proxyBaseUrl}/{proxyPath.TrimStart('/')}";
        if (queryValues.Count > 0)
        {
            proxyUrl = $"{proxyUrl}?{string.Join('&', queryValues)}";
        }

        return proxyUrl;
    }
}
