namespace Vela.Api.Application;

public sealed class MapTilerProxyException : Exception
{
    public int StatusCode { get; }

    public MapTilerProxyException(int statusCode, string message)
        : base(message)
    {
        StatusCode = statusCode;
    }
}
