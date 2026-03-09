using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vela.Api.BL;
using Vela.Api.DTOs;
using Vela.Api.Validators;
using UserModel = Vela.Api.BL.User;

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
            try
            {
                List<string> validationErrors = RequestValidator.ValidateRegistrationRequest(
                    request
                );
                if (validationErrors.Any())
                {
                    return BadRequest(new { errors = validationErrors });
                }

                var user = new UserModel
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
            catch
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
                if (
                    string.IsNullOrWhiteSpace(request.Email)
                    || string.IsNullOrWhiteSpace(request.Password)
                )
                {
                    return BadRequest("Email and password are required.");
                }

                UserModel? loggedInUser = UserModel.Login(request.Email, request.Password);

                if (loggedInUser == null)
                {
                    return Unauthorized("Invalid email or password.");
                }

                return Ok(BuildAuthResponse(loggedInUser));
            }
            catch
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
                var rawUserId = User.FindFirst("sub")?.Value;
                if (!Guid.TryParse(rawUserId, out var userId))
                {
                    return Unauthorized();
                }

                UserModel? user = UserModel.GetById(userId);
                if (user == null)
                {
                    return Unauthorized();
                }

                return Ok(MapToAuthUserDto(user));
            }
            catch
            {
                return StatusCode(500, "An error occurred while loading profile.");
            }
        }

        private AuthResponseDto BuildAuthResponse(UserModel user)
        {
            var tokenResult = JwtManager.CreateToken(user, _configuration);
            return new AuthResponseDto
            {
                Token = tokenResult.Token,
                ExpiresAtUtc = tokenResult.ExpiresAtUtc,
                User = MapToAuthUserDto(user)
            };
        }

        private static AuthUserDto MapToAuthUserDto(UserModel user)
        {
            return new AuthUserDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                IsAdmin = user.IsAdmin
            };
        }
    }
}
