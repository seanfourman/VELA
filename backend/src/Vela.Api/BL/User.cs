using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string HashedPassword { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public string Role { get; set; } = "user";
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string Register(string plainTextPassword)
    {
        UserService userService = new();

        var normalizedEmail = Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return "INVALID_EMAIL";
        }

        if (userService.GetUserByEmail(normalizedEmail) != null)
        {
            return "USER_EXISTS";
        }

        Email = normalizedEmail;
        Name = string.IsNullOrWhiteSpace(Name) ? normalizedEmail.Split('@')[0] : Name.Trim();
        DisplayName = string.IsNullOrWhiteSpace(DisplayName) ? Name : DisplayName.Trim();
        HashedPassword = BCrypt.Net.BCrypt.HashPassword(plainTextPassword);
        IsAdmin = false;
        Role = "user";
        CreatedAtUtc = DateTime.UtcNow;
        Id = userService.InsertUser(this);

        return Id == Guid.Empty ? "GENERIC_FAILURE" : "SUCCESS";
    }

    public static User? Login(string email, string password)
    {
        UserService userService = new();
        var normalizedEmail = email.Trim().ToLowerInvariant();
        User? userFromDb = userService.GetUserByEmail(normalizedEmail);

        if (userFromDb != null && BCrypt.Net.BCrypt.Verify(password, userFromDb.HashedPassword))
        {
            return userFromDb;
        }

        return null;
    }

    public static User? GetById(Guid id)
    {
        UserService userService = new();
        return userService.GetUserById(id);
    }

    public static UserProfileDto? GetProfile(Guid id)
    {
        UserService userService = new();
        return userService.GetUserProfile(id);
    }

    public static UserProfileDto? UpdateProfile(Guid id, UpdateUserProfileRequestDto request)
    {
        UserService userService = new();
        return userService.UpdateUserProfile(id, request);
    }
}
