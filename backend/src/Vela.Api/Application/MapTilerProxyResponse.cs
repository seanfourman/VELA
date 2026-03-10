namespace Vela.Api.Application;

public sealed class MapTilerProxyResponse
{
    public byte[] Content { get; init; } = Array.Empty<byte>();
    public string ContentType { get; init; } = "application/octet-stream";
    public string? CacheControl { get; init; }
    public string? ETag { get; init; }
    public DateTimeOffset? LastModified { get; init; }
    public string? ContentEncoding { get; init; }
}
