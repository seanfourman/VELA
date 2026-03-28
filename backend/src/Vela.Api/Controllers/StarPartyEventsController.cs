using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api/star-party-events")]
public class StarPartyEventsController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public IActionResult GetEvents()
    {
        try
        {
            return Ok(BL.StarPartyEvent.GetAll());
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving events.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public IActionResult SaveEvent([FromBody] UpsertStarPartyEventRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            List<string> validationErrors = RequestValidator.ValidateStarPartyEventRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            var hostUser = ReadCurrentUser();
            if (hostUser == null) return Unauthorized();

            return Ok(BL.StarPartyEvent.Save(request, hostUser));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while saving event.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("{id}/status")]
    public IActionResult SetEventStatus(string id, [FromBody] SetStarPartyEventStatusRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("id is required.");
            if (request is null)
                return BadRequest("Request body is required.");

            List<string> validationErrors = RequestValidator.ValidateStarPartyEventStatusRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            var updated = BL.StarPartyEvent.SetStatus(id.Trim(), request.Status);
            if (updated == null) return NotFound();

            return Ok(updated);
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating event status.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public IActionResult DeleteEvent(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("id is required.");

            if (!BL.StarPartyEvent.Delete(id.Trim()))
                return NotFound();

            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while deleting event.");
        }
    }

    [Authorize]
    [HttpPost("{id}/rsvp/toggle")]
    public IActionResult ToggleRsvp(string id)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("id is required.");

            var currentUser = ReadCurrentUser();
            if (currentUser == null) return Unauthorized();

            var (updatedEvent, joined) = BL.StarPartyEvent.ToggleRsvp(id.Trim(), currentUser);
            if (updatedEvent == null) return NotFound();

            return Ok(new ToggleStarPartyRsvpResponseDto
            {
                Event = updatedEvent,
                Joined = joined,
                RsvpCount = updatedEvent.Rsvps.Count,
            });
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while toggling RSVP.");
        }
    }

    private Models.User? ReadCurrentUser()
    {
        var userId = BL.User.ReadUserId(User);
        if (!userId.HasValue) return null;
        return BL.User.GetById(userId.Value);
    }
}
