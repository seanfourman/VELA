using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecommendationsController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public IActionResult GetRecommendations()
    {
        try
        {
            return Ok(BL.Recommendation.GetAll());
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving recommendations.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public IActionResult SaveRecommendation([FromBody] UpsertRecommendationRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            List<string> validationErrors = RequestValidator.ValidateRecommendationRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            return Ok(BL.Recommendation.Save(request));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while saving recommendation.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public IActionResult DeleteRecommendation(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("id is required.");

            if (!BL.Recommendation.Delete(id.Trim()))
                return NotFound();

            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting recommendation.");
        }
    }
}
