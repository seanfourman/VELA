using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Vela.Api.Configuration;

public static class UserClaimsExtensions
{
    private static readonly string[] UserIdClaimTypes =
    [
        JwtRegisteredClaimNames.Sub,
        ClaimTypes.NameIdentifier,
        "sub",
        "nameid"
    ];

    public static Guid? ReadUserId(this ClaimsPrincipal? principal)
    {
        if (principal is null)
        {
            return null;
        }

        foreach (var claimType in UserIdClaimTypes)
        {
            var rawUserId = principal.FindFirst(claimType)?.Value;
            if (Guid.TryParse(rawUserId, out var userId))
            {
                return userId;
            }
        }

        return null;
    }
}
