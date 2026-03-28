using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.Application;
using Vela.Api.DTOs;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api")]
public class SkyMapController : ControllerBase
{
    private readonly WorldAtlasService _worldAtlasService;
    private readonly VisiblePlanetsService _visiblePlanetsService;

    public SkyMapController(WorldAtlasService worldAtlasService, VisiblePlanetsService visiblePlanetsService)
    {
        _worldAtlasService = worldAtlasService;
        _visiblePlanetsService = visiblePlanetsService;
    }

    [AllowAnonymous]
    [HttpGet("visible-planets")]
    public async Task<IActionResult> GetVisiblePlanets(
        [FromQuery] double lat,
        [FromQuery(Name = "lon")] double lon,
        CancellationToken cancellationToken = default)
    {
        if (!double.IsFinite(lat) || !double.IsFinite(lon))
            return BadRequest(new { error = "Invalid lat/lon query params" });

        try
        {
            var response = await _visiblePlanetsService.GetAsync(lat, lon, cancellationToken);
            Response.Headers["Cache-Control"] = response.CacheControl;
            return File(response.Content, response.ContentType);
        }
        catch (Exception)
        {
            return StatusCode(500, new { error = "Failed to fetch visible planets" });
        }
    }

    [AllowAnonymous]
    [HttpGet("skyquality")]
    public ActionResult<SkyQualityResponseDto> GetSkyQuality([FromQuery] double lat, [FromQuery] double lon)
    {
        if (!double.IsFinite(lat) || !double.IsFinite(lon))
            return BadRequest(new { error = "Invalid lat/lon query params" });

        try
        {
            Response.Headers["Cache-Control"] = "public, max-age=86400";
            return Ok(_worldAtlasService.GetSkyQuality(lat, lon));
        }
        catch (ArgumentOutOfRangeException)
        {
            return BadRequest(new { error = "Coordinates out of dataset bounds" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "No data at this coordinate" });
        }
    }

    [AllowAnonymous]
    [HttpGet("darkspots")]
    public ActionResult<DarkSpotsResponseDto> GetDarkSpots(
        [FromQuery] double lat, [FromQuery] double lon, [FromQuery] double? searchDistance)
    {
        if (!double.IsFinite(lat) || !double.IsFinite(lon))
            return BadRequest(new { error = "Invalid lat/lon query params" });

        try
        {
            Response.Headers["Cache-Control"] = "public, max-age=600";
            return Ok(_worldAtlasService.GetDarkSpots(lat, lon, searchDistance ?? 25d));
        }
        catch (ArgumentOutOfRangeException)
        {
            return BadRequest(new { error = "Coordinates out of dataset bounds" });
        }
    }

    [AllowAnonymous]
    [HttpGet("lightmap/{z:int}/{x:int}/{y:int}.png")]
    public async Task<IActionResult> GetLightmapTile(int z, int x, int y, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _worldAtlasService.GetLightTileAsync(z, x, y, cancellationToken);
            Response.Headers["Cache-Control"] = response.CacheControl;
            return File(response.Content, response.ContentType);
        }
        catch (ArgumentOutOfRangeException)
        {
            return BadRequest(new { error = "Invalid tile coordinates" });
        }
    }
}
