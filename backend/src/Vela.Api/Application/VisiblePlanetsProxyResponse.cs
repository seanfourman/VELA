namespace Vela.Api.Application;

public sealed class VisiblePlanetsProxyResponse
{
    public byte[] Content { get; set; } = [];
    public string ContentType { get; set; } = "application/json; charset=utf-8";
    public string CacheControl { get; set; } = "public, max-age=600";
}
