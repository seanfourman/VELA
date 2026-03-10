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
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;

        public UsersController(IUserService userService, ITokenService tokenService)
        {
            _userService = userService;
            _tokenService = tokenService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            List<string> validationErrors = RequestValidator.ValidateRegistrationRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(new { errors = validationErrors });
            }

            var result = _userService.Register(request);

            return result.Status switch
            {
                RegisterUserStatus.Success when result.User != null => Ok(BuildAuthResponse(result.User)),
                RegisterUserStatus.UserExists => Conflict("An account with that email already exists."),
                RegisterUserStatus.InvalidEmail => BadRequest("A valid email is required."),
                _ => StatusCode(500, "Registration failed due to an unknown error."),
            };
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            if (
                string.IsNullOrWhiteSpace(request.Email)
                || string.IsNullOrWhiteSpace(request.Password)
            )
            {
                return BadRequest("Email and password are required.");
            }

            var loggedInUser = _userService.Login(request.Email, request.Password);
            if (loggedInUser == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            return Ok(BuildAuthResponse(loggedInUser));
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var userId = User.ReadUserId();
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var user = _userService.GetById(userId.Value);
            if (user == null)
            {
                return Unauthorized();
            }

            return Ok(MapToAuthUserDto(user));
        }

        [Authorize]
        [HttpGet("profile")]
        public IActionResult GetProfile()
        {
            var userId = User.ReadUserId();
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var profile = _userService.GetProfile(userId.Value);
            if (profile == null)
            {
                return NotFound();
            }

            return Ok(profile);
        }

        [Authorize]
        [HttpPut("profile")]
        public IActionResult UpdateProfile([FromBody] UpdateUserProfileRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            List<string> validationErrors = RequestValidator.ValidateUserProfileRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(new { errors = validationErrors });
            }

            var userId = User.ReadUserId();
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var updated = _userService.UpdateProfile(userId.Value, request);
            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("admin/manage")]
        public IActionResult GetManagedUsers()
        {
            return Ok(_userService.GetManagedUsers());
        }

        [Authorize(Roles = "admin")]
        [HttpPatch("admin/manage/{id:guid}")]
        public IActionResult UpdateUserAccess(Guid id, [FromBody] UpdateUserAccessRequestDto request)
        {
            if (request is null)
            {
                return BadRequest("Request body is required.");
            }

            var actorUserId = User.ReadUserId();
            if (!actorUserId.HasValue)
            {
                return Unauthorized();
            }

            var result = _userService.UpdateUserAccess(actorUserId.Value, id, request);

            return result.Status switch
            {
                UpdateUserAccessStatus.Success when result.User != null => Ok(result.User),
                UpdateUserAccessStatus.UserNotFound => NotFound("User not found."),
                UpdateUserAccessStatus.InvalidRole => BadRequest("Only 'user' and 'admin' roles are supported."),
                UpdateUserAccessStatus.CannotRemoveLastAdmin => Conflict("At least one admin account must remain."),
                UpdateUserAccessStatus.CannotModifyOwnAccess => BadRequest("Change another account from the admin panel, not your current one."),
                _ => StatusCode(500, "Could not update user access."),
            };
        }

        private AuthResponseDto BuildAuthResponse(User user)
        {
            var tokenResult = _tokenService.CreateToken(user);
            return new AuthResponseDto
            {
                Token = tokenResult.Token,
                ExpiresAtUtc = tokenResult.ExpiresAtUtc,
                User = MapToAuthUserDto(user),
            };
        }

        private static AuthUserDto MapToAuthUserDto(User user)
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
}
