using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    [HttpGet]
    public IActionResult GetFavorites()
    {
        try
        {
            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            return Ok(BL.Favorite.GetByUserId(userId.Value));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving favorites.");
        }
    }

    [HttpPost]
    public IActionResult SaveFavorite([FromBody] CreateFavoriteRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            List<string> validationErrors = RequestValidator.ValidateFavoriteRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            return Ok(BL.Favorite.Save(userId.Value, request));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while saving favorite.");
        }
    }

    [HttpPut("{spotId}")]
    public IActionResult UpdateFavorite(string spotId, [FromBody] UpdateFavoriteRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(spotId))
                return BadRequest("spotId is required.");
            if (request is null)
                return BadRequest("Request body is required.");

            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            List<string> validationErrors = RequestValidator.ValidateFavoriteUpdateRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            var updated = BL.Favorite.Update(userId.Value, spotId, request);
            if (updated is null) return NotFound();

            return Ok(updated);
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating favorite.");
        }
    }

    [HttpDelete("{spotId}")]
    public IActionResult DeleteFavorite(string spotId)
    {
        try
        {
            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            if (string.IsNullOrWhiteSpace(spotId))
                return BadRequest("spotId is required.");

            if (!BL.Favorite.Delete(userId.Value, spotId))
                return NotFound();

            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting favorite.");
        }
    }
}
