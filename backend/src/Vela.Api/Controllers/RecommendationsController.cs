using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.BL;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        [AllowAnonymous]
        [HttpGet]
        public IActionResult GetRecommendations()
        {
            var recommendations = Recommendation.GetAll();
            return Ok(recommendations);
        }

        [Authorize(Roles = "admin")]
        [HttpPost]
        public IActionResult SaveRecommendation([FromBody] UpsertRecommendationRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            List<string> validationErrors = RequestValidator.ValidateRecommendationRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(new { errors = validationErrors });
            }

            var saved = Recommendation.Save(request);
            return Ok(saved);
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public IActionResult DeleteRecommendation(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("id is required.");
            }

            var deleted = Recommendation.Delete(id.Trim());
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}
