using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.BL;
using Vela.Api.Configuration;
using Vela.Api.DTOs;
using Vela.Api.Validators;

namespace Vela.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public UsersController(IConfiguration configuration)
        {
            _configuration = configuration;
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

            var user = new Vela.Api.BL.User
            {
                Email = request.Email.Trim().ToLowerInvariant(),
                Name = string.IsNullOrWhiteSpace(request.Name)
                    ? request.Email.Split('@')[0]
                    : request.Name.Trim()
            };

            var result = user.Register(request.Password);

            return result switch
            {
                "SUCCESS" => Ok(BuildAuthResponse(user)),
                "USER_EXISTS" => Conflict("An account with that email already exists."),
                _ => StatusCode(500, "Registration failed due to an unknown error.")
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

            Vela.Api.BL.User? loggedInUser = Vela.Api.BL.User.Login(request.Email, request.Password);

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

            Vela.Api.BL.User? user = Vela.Api.BL.User.GetById(userId.Value);
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

            var profile = Vela.Api.BL.User.GetProfile(userId.Value);
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

            var updated = Vela.Api.BL.User.UpdateProfile(userId.Value, request);
            if (updated == null)
            {
                return NotFound();
            }

            return Ok(updated);
        }

        private AuthResponseDto BuildAuthResponse(Vela.Api.BL.User user)
        {
            var tokenResult = JwtManager.CreateToken(user, _configuration);
            return new AuthResponseDto
            {
                Token = tokenResult.Token,
                ExpiresAtUtc = tokenResult.ExpiresAtUtc,
                User = MapToAuthUserDto(user)
            };
        }

        private static AuthUserDto MapToAuthUserDto(Vela.Api.BL.User user)
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
                Bio = user.Bio
            };
        }
    }
}
