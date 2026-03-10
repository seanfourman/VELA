using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.Application;
using Vela.Api.Configuration;
using Vela.Api.DTOs;
using Vela.Api.Models;
using Vela.Api.Validators;

namespace Vela.Api.Controllers
{
    [ApiController]
    [Route("api/star-party-events")]
    public class StarPartyEventsController : ControllerBase
    {
        private readonly IStarPartyEventService _starPartyEventService;
        private readonly IUserService _userService;

        public StarPartyEventsController(
            IStarPartyEventService starPartyEventService,
            IUserService userService
        )
        {
            _starPartyEventService = starPartyEventService;
            _userService = userService;
        }

        [AllowAnonymous]
        [HttpGet]
        public IActionResult GetEvents()
        {
            var events = _starPartyEventService.GetAll();
            return Ok(events);
        }

        [Authorize(Roles = "admin")]
        [HttpPost]
        public IActionResult SaveEvent([FromBody] UpsertStarPartyEventRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            List<string> validationErrors = RequestValidator.ValidateStarPartyEventRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(new { errors = validationErrors });
            }

            var hostUser = ReadCurrentUser();
            if (hostUser == null)
            {
                return Unauthorized();
            }

            var saved = _starPartyEventService.Save(request, hostUser);
            return Ok(saved);
        }

        [Authorize(Roles = "admin")]
        [HttpPatch("{id}/status")]
        public IActionResult SetEventStatus(
            string id,
            [FromBody] SetStarPartyEventStatusRequestDto request
        )
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("id is required.");
            }

            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            List<string> validationErrors = RequestValidator.ValidateStarPartyEventStatusRequest(
                request
            );
            if (validationErrors.Any())
            {
                return BadRequest(new { errors = validationErrors });
            }

            var updated = _starPartyEventService.SetStatus(id.Trim(), request.Status);
            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public IActionResult DeleteEvent(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("id is required.");
            }

            var deleted = _starPartyEventService.Delete(id.Trim());
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }

        [Authorize]
        [HttpPost("{id}/rsvp/toggle")]
        public IActionResult ToggleRsvp(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("id is required.");
            }

            var currentUser = ReadCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var result = _starPartyEventService.ToggleRsvp(id.Trim(), currentUser);
            if (result.Event == null)
            {
                return NotFound();
            }

            return Ok(
                new ToggleStarPartyRsvpResponseDto
                {
                    Event = result.Event,
                    Joined = result.Joined,
                    RsvpCount = result.Event.Rsvps.Count,
                }
            );
        }

        private User? ReadCurrentUser()
        {
            var userId = User.ReadUserId();
            if (!userId.HasValue)
            {
                return null;
            }

            return _userService.GetById(userId.Value);
        }
    }
}
