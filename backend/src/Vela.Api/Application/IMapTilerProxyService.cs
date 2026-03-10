namespace Vela.Api.Application;

public interface IMapTilerProxyService
{
    Task<MapTilerProxyResponse> GetResourceAsync(
        string resourcePath,
        IReadOnlyDictionary<string, string?> query,
        string proxyBaseUrl,
        CancellationToken cancellationToken = default
    );
}
