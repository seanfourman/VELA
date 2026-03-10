using Vela.Api.DTOs;

namespace Vela.Api.Application;

public enum UpdateUserAccessStatus
{
    Success,
    UserNotFound,
    InvalidRole,
    CannotRemoveLastAdmin,
    CannotModifyOwnAccess,
}

public sealed class UpdateUserAccessResult
{
    public UpdateUserAccessStatus Status { get; init; }
    public AdminManagedUserDto? User { get; init; }
}
