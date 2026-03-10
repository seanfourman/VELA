using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.Application;
using Vela.Api.DTOs;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api/space-weather")]
public sealed class SpaceWeatherController : ControllerBase
{
    private readonly ISpaceWeatherService _spaceWeatherService;

    public SpaceWeatherController(ISpaceWeatherService spaceWeatherService)
    {
        _spaceWeatherService = spaceWeatherService;
    }

    [AllowAnonymous]
    [HttpGet("snapshot")]
    public async Task<ActionResult<SpaceWeatherRawSnapshotDto>> GetSnapshot(
        [FromQuery] bool force = false,
        CancellationToken cancellationToken = default
    )
    {
        var snapshot = await _spaceWeatherService.GetSnapshotAsync(force, cancellationToken);
        return Ok(snapshot);
    }
}
