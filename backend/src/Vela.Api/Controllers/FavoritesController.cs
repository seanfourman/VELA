using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.BL;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers
{
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
                var userId = ReadUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized();
                }

                var favorites = FavoriteSpot.GetByUserId(userId.Value);
                return Ok(favorites);
            }
            catch
            {
                return StatusCode(500, "An error occurred while retrieving favorites.");
            }
        }

        [HttpPost]
        public IActionResult SaveFavorite([FromBody] CreateFavoriteRequestDto request)
        {
            try
            {
                var userId = ReadUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized();
                }

                List<string> validationErrors = RequestValidator.ValidateFavoriteRequest(request);
                if (validationErrors.Any())
                {
                    return BadRequest(new { errors = validationErrors });
                }

                var saved = FavoriteSpot.Save(userId.Value, request);
                return Ok(saved);
            }
            catch
            {
                return StatusCode(500, "An error occurred while saving favorite.");
            }
        }

        [HttpDelete("{spotId}")]
        public IActionResult DeleteFavorite(string spotId)
        {
            try
            {
                var userId = ReadUserId();
                if (!userId.HasValue)
                {
                    return Unauthorized();
                }

                if (string.IsNullOrWhiteSpace(spotId))
                {
                    return BadRequest("spotId is required.");
                }

                var deleted = FavoriteSpot.Delete(userId.Value, spotId);
                if (!deleted)
                {
                    return NotFound();
                }

                return NoContent();
            }
            catch
            {
                return StatusCode(500, "An error occurred while deleting favorite.");
            }
        }

        private Guid? ReadUserId()
        {
            var rawUserId = User.FindFirst("sub")?.Value;
            return Guid.TryParse(rawUserId, out var userId) ? userId : null;
        }
    }
}
