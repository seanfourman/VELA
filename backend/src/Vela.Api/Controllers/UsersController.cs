using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            List<string> validationErrors = RequestValidator.ValidateRegistrationRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            var (status, user) = BL.User.Register(request);

            return status switch
            {
                "Success" when user != null => Ok(BuildAuthResponse(user)),
                "UserExists" => Conflict("An account with that email already exists."),
                "InvalidEmail" => BadRequest("A valid email is required."),
                _ => StatusCode(500, "Registration failed due to an unknown error."),
            };
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred during registration.");
        }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Email and password are required.");

            var loggedInUser = BL.User.Login(request.Email, request.Password);
            if (loggedInUser == null)
                return Unauthorized("Invalid email or password.");

            return Ok(BuildAuthResponse(loggedInUser));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred during login.");
        }
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        try
        {
            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            var user = BL.User.GetById(userId.Value);
            if (user == null) return Unauthorized();

            return Ok(MapToAuthUserDto(user));
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving user.");
        }
    }

    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        try
        {
            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            var profile = BL.User.GetProfile(userId.Value);
            if (profile == null) return NotFound();

            return Ok(profile);
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving profile.");
        }
    }

    [Authorize]
    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] UpdateUserProfileRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            List<string> validationErrors = RequestValidator.ValidateUserProfileRequest(request);
            if (validationErrors.Any())
                return BadRequest(new { errors = validationErrors });

            var userId = BL.User.ReadUserId(User);
            if (!userId.HasValue) return Unauthorized();

            var updated = BL.User.UpdateProfile(userId.Value, request);
            if (updated == null) return NotFound();

            return Ok(updated);
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating profile.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpGet("admin/manage")]
    public IActionResult GetManagedUsers()
    {
        try
        {
            return Ok(BL.User.GetManagedUsers());
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while retrieving users.");
        }
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("admin/manage/{id:guid}")]
    public IActionResult UpdateUserAccess(Guid id, [FromBody] UpdateUserAccessRequestDto request)
    {
        try
        {
            if (request is null)
                return BadRequest("Request body is required.");

            var actorUserId = BL.User.ReadUserId(User);
            if (!actorUserId.HasValue) return Unauthorized();

            var (status, updatedUser) = BL.User.UpdateUserAccess(actorUserId.Value, id, request);

            return status switch
            {
                "Success" when updatedUser != null => Ok(updatedUser),
                "UserNotFound" => NotFound("User not found."),
                "InvalidRole" => BadRequest("Only 'user' and 'admin' roles are supported."),
                "CannotRemoveLastAdmin" => Conflict("At least one admin account must remain."),
                "CannotModifyOwnAccess" => BadRequest("Change another account from the admin panel, not your current one."),
                _ => StatusCode(500, "Could not update user access."),
            };
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while updating user access.");
        }
    }

    private static AuthResponseDto BuildAuthResponse(Models.User user)
    {
        var (token, expiresAt) = BL.User.CreateToken(user);
        return new AuthResponseDto
        {
            Token = token,
            ExpiresAtUtc = expiresAt,
            User = MapToAuthUserDto(user),
        };
    }

    private static AuthUserDto MapToAuthUserDto(Models.User user)
    {
        return new AuthUserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            Name = user.Name,
            Role = user.Role,
            IsAdmin = user.IsAdmin,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
        };
    }
}
