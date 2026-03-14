using Vela.Api.DAL;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.Application;

public sealed class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "user",
        "admin",
    };

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
            if (_userRepository.GetUserByEmail(normalizedEmail) != null)
            {
                return new RegisterUserResult { Status = RegisterUserStatus.UserExists };
            }

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

    public List<AdminManagedUserDto> GetManagedUsers()
    {
        return _userRepository.GetManagedUsers();
    }

    public UpdateUserAccessResult UpdateUserAccess(
        Guid actorUserId,
        Guid targetUserId,
        UpdateUserAccessRequestDto request
    )
    {
        if (actorUserId == targetUserId)
        {
            return new UpdateUserAccessResult
            {
                Status = UpdateUserAccessStatus.CannotModifyOwnAccess,
            };
        }

        var user = _userRepository.GetUserById(targetUserId);
        if (user == null)
        {
            return new UpdateUserAccessResult { Status = UpdateUserAccessStatus.UserNotFound };
        }

        var requestedRole = string.IsNullOrWhiteSpace(request.Role)
            ? (request.IsAdmin ? "admin" : "user")
            : request.Role.Trim().ToLowerInvariant();

        if (!AllowedRoles.Contains(requestedRole))
        {
            return new UpdateUserAccessResult { Status = UpdateUserAccessStatus.InvalidRole };
        }

        var nextIsAdmin = request.IsAdmin || string.Equals(requestedRole, "admin");
        var nextRole = nextIsAdmin ? "admin" : "user";

        if (user.IsAdmin && !nextIsAdmin && _userRepository.GetAdminCount() <= 1)
        {
            return new UpdateUserAccessResult
            {
                Status = UpdateUserAccessStatus.CannotRemoveLastAdmin,
            };
        }

        var updatedUser = _userRepository.UpdateUserAccess(targetUserId, nextIsAdmin, nextRole);
        if (updatedUser == null)
        {
            return new UpdateUserAccessResult { Status = UpdateUserAccessStatus.UserNotFound };
        }

        return new UpdateUserAccessResult
        {
            Status = UpdateUserAccessStatus.Success,
            User = MapToManagedUser(updatedUser),
        };
    }

    private static AdminManagedUserDto MapToManagedUser(User user)
    {
        return new AdminManagedUserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            Name = user.Name,
            DisplayName = user.DisplayName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            Role = user.Role,
            IsAdmin = user.IsAdmin,
            CreatedAtUtc = user.CreatedAtUtc,
        };
    }
}
