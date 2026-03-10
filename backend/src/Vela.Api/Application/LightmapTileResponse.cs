namespace Vela.Api.Application;

public sealed class LightmapTileResponse
{
    public byte[] Content { get; set; } = [];
    public string ContentType { get; set; } = "image/png";
    public string CacheControl { get; set; } = "public, max-age=3600";
}
