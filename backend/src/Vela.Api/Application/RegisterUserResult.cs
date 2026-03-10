using Vela.Api.Models;

namespace Vela.Api.Application;

public enum RegisterUserStatus
{
    Success,
    UserExists,
    InvalidEmail,
    Failure,
}

public sealed class RegisterUserResult
{
    public RegisterUserStatus Status { get; init; }
    public User? User { get; init; }
}
