using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class User
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase) { "user", "admin" };

    private static readonly string[] UserIdClaimTypes =
    [
        // Support both raw JWT claim names and framework-mapped claim aliases.
        JwtRegisteredClaimNames.Sub,
        ClaimTypes.NameIdentifier,
        "sub",
        "nameid"
    ];

    public static (string Status, Models.User? User) Register(RegisterRequestDto request)
    {
        var userService = new UserService();
        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedEmail))
            return ("InvalidEmail", null);

        if (userService.GetUserByEmail(normalizedEmail) != null)
            return ("UserExists", null);

        var normalizedName = string.IsNullOrWhiteSpace(request.Name)
            ? normalizedEmail.Split('@')[0]
            : request.Name.Trim();

        var user = new Models.User
        {
            Email = normalizedEmail,
            Name = normalizedName,
            DisplayName = normalizedName,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsAdmin = false,
            Role = "user",
            CreatedAtUtc = DateTime.UtcNow,
        };

        var insertedId = userService.InsertUser(user);
        if (insertedId == Guid.Empty)
        {
            if (userService.GetUserByEmail(normalizedEmail) != null)
                return ("UserExists", null);
            return ("Failure", null);
        }

        user.Id = insertedId;
        return ("Success", user);
    }

    public static Models.User? Login(string email, string password)
    {
        var userService = new UserService();
        var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedEmail)) return null;

        var user = userService.GetUserByEmail(normalizedEmail);
        if (user != null && BCrypt.Net.BCrypt.Verify(password, user.HashedPassword))
            return user;

        return null;
    }

    public static Models.User? GetById(Guid id)
    {
        var userService = new UserService();
        return userService.GetUserById(id);
    }

    public static UserProfileDto? GetProfile(Guid id)
    {
        var userService = new UserService();
        return userService.GetUserProfile(id);
    }

    public static UserProfileDto? UpdateProfile(Guid id, UpdateUserProfileRequestDto request)
    {
        var userService = new UserService();
        return userService.UpdateUserProfile(id, request);
    }

    public static List<AdminManagedUserDto> GetManagedUsers()
    {
        var userService = new UserService();
        return userService.GetManagedUsers();
    }

    public static (string Status, AdminManagedUserDto? User) UpdateUserAccess(
        Guid actorUserId, Guid targetUserId, UpdateUserAccessRequestDto request)
    {
        var userService = new UserService();

        // Prevent the active admin from removing their own access in the same session.
        if (actorUserId == targetUserId)
            return ("CannotModifyOwnAccess", null);

        var user = userService.GetUserById(targetUserId);
        if (user == null)
            return ("UserNotFound", null);

        var requestedRole = string.IsNullOrWhiteSpace(request.Role)
            ? (request.IsAdmin ? "admin" : "user")
            : request.Role.Trim().ToLowerInvariant();

        if (!AllowedRoles.Contains(requestedRole))
            return ("InvalidRole", null);

        var nextIsAdmin = request.IsAdmin || string.Equals(requestedRole, "admin");
        var nextRole = nextIsAdmin ? "admin" : "user";

        if (user.IsAdmin && !nextIsAdmin && userService.GetAdminCount() <= 1)
            return ("CannotRemoveLastAdmin", null);

        var updatedUser = userService.UpdateUserAccess(targetUserId, nextIsAdmin, nextRole);
        if (updatedUser == null)
            return ("UserNotFound", null);

        var dto = new AdminManagedUserDto
        {
            Id = updatedUser.Id.ToString(),
            Email = updatedUser.Email,
            Name = updatedUser.Name,
            DisplayName = updatedUser.DisplayName,
            AvatarUrl = updatedUser.AvatarUrl,
            Bio = updatedUser.Bio,
            Role = updatedUser.Role,
            IsAdmin = updatedUser.IsAdmin,
            CreatedAtUtc = updatedUser.CreatedAtUtc,
        };
        return ("Success", dto);
    }

    public static (string Token, DateTime ExpiresAtUtc) CreateToken(Models.User user)
    {
        var configuration = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build();
        var issuer = configuration["Jwt:Issuer"] ?? "Vela.Api";
        var audience = configuration["Jwt:Audience"] ?? "Vela.Client";
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var expiresMinutes = int.TryParse(configuration["Jwt:ExpiresMinutes"], out var m) ? m : 480;
        var expiresAt = DateTime.UtcNow.AddMinutes(Math.Max(5, expiresMinutes));

        var claims = new List<Claim>
        {
            // Profile fields stay out of the token and continue to come from API reads.
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.UniqueName, user.Name),
            new(ClaimTypes.Role, user.Role),
            new("is_admin", user.IsAdmin ? "true" : "false"),
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public static Guid? ReadUserId(ClaimsPrincipal? principal)
    {
        if (principal is null) return null;
        // Different hosts can surface the subject claim under different names.
        foreach (var claimType in UserIdClaimTypes)
        {
            var rawUserId = principal.FindFirst(claimType)?.Value;
            if (Guid.TryParse(rawUserId, out var userId)) return userId;
        }
        return null;
    }
}
