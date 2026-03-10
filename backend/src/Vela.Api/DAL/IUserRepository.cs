using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public interface IUserRepository
{
    User? GetUserByEmail(string email);
    User? GetUserById(Guid id);
    Guid InsertUser(User user);
    UserProfileDto? GetUserProfile(Guid userId);
    UserProfileDto? UpdateUserProfile(Guid userId, UpdateUserProfileRequestDto request);
    List<AdminManagedUserDto> GetManagedUsers();
    User? UpdateUserAccess(Guid userId, bool isAdmin, string role);
    int GetAdminCount();
}
