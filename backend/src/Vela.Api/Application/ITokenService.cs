using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.Application;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}
