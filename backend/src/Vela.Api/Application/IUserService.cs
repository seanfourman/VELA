using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.Application;

public interface IUserService
{
    RegisterUserResult Register(RegisterRequestDto request);
    User? Login(string email, string password);
    User? GetById(Guid id);
    UserProfileDto? GetProfile(Guid id);
    UserProfileDto? UpdateProfile(Guid id, UpdateUserProfileRequestDto request);
}
