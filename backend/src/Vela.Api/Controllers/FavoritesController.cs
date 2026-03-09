using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.BL;
using Vela.Api.Configuration;
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
            var userId = ReadUserId();
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var favorites = FavoriteSpot.GetByUserId(userId.Value);
            return Ok(favorites);
        }

        [HttpPost]
        public IActionResult SaveFavorite([FromBody] CreateFavoriteRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

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

        [HttpDelete("{spotId}")]
        public IActionResult DeleteFavorite(string spotId)
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

        private Guid? ReadUserId()
        {
            return User.ReadUserId();
        }
    }
}
