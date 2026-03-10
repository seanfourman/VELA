using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.Application;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api/maptiler")]
public sealed class MapTilerController : ControllerBase
{
    private readonly IMapTilerProxyService _mapTilerProxyService;

    public MapTilerController(IMapTilerProxyService mapTilerProxyService)
    {
        _mapTilerProxyService = mapTilerProxyService;
    }

    [AllowAnonymous]
    [HttpGet("{**resourcePath}")]
    public async Task<IActionResult> GetResource(
        string resourcePath,
        CancellationToken cancellationToken = default
    )
    {
        var query = Request.Query.ToDictionary(
            entry => entry.Key,
            entry => (string?)entry.Value.ToString(),
            StringComparer.OrdinalIgnoreCase
        );
        var proxyBaseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/maptiler";
        var response = await _mapTilerProxyService.GetResourceAsync(
            resourcePath,
            query,
            proxyBaseUrl,
            cancellationToken
        );

        if (!string.IsNullOrWhiteSpace(response.CacheControl))
        {
            Response.Headers["Cache-Control"] = response.CacheControl;
        }

        if (!string.IsNullOrWhiteSpace(response.ETag))
        {
            Response.Headers["ETag"] = response.ETag;
        }

        if (response.LastModified.HasValue)
        {
            Response.Headers["Last-Modified"] = response.LastModified.Value.ToString("R");
        }

        if (!string.IsNullOrWhiteSpace(response.ContentEncoding))
        {
            Response.Headers["Content-Encoding"] = response.ContentEncoding;
        }

        return File(response.Content, response.ContentType);
    }
}
