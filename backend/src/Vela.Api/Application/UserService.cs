using Vela.Api.DAL;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.Application;

public sealed class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public RegisterUserResult Register(RegisterRequestDto request)
    {
        var normalizedEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return new RegisterUserResult { Status = RegisterUserStatus.InvalidEmail };
        }

        if (_userRepository.GetUserByEmail(normalizedEmail) != null)
        {
            return new RegisterUserResult { Status = RegisterUserStatus.UserExists };
        }

        var normalizedName = string.IsNullOrWhiteSpace(request.Name)
            ? normalizedEmail.Split('@')[0]
            : request.Name.Trim();

        var user = new User
        {
            Email = normalizedEmail,
            Name = normalizedName,
            DisplayName = normalizedName,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsAdmin = false,
            Role = "user",
            CreatedAtUtc = DateTime.UtcNow,
        };

        var insertedId = _userRepository.InsertUser(user);
        if (insertedId == Guid.Empty)
        {
            return new RegisterUserResult { Status = RegisterUserStatus.Failure };
        }

        user.Id = insertedId;
        return new RegisterUserResult
        {
            Status = RegisterUserStatus.Success,
            User = user,
        };
    }

    public User? Login(string email, string password)
    {
        var normalizedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return null;
        }

        var userFromDb = _userRepository.GetUserByEmail(normalizedEmail);
        if (userFromDb != null && BCrypt.Net.BCrypt.Verify(password, userFromDb.HashedPassword))
        {
            return userFromDb;
        }

        return null;
    }

    public User? GetById(Guid id)
    {
        return _userRepository.GetUserById(id);
    }

    public UserProfileDto? GetProfile(Guid id)
    {
        return _userRepository.GetUserProfile(id);
    }

    public UserProfileDto? UpdateProfile(Guid id, UpdateUserProfileRequestDto request)
    {
        return _userRepository.UpdateUserProfile(id, request);
    }
}
