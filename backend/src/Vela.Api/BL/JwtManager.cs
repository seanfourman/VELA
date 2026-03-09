using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Vela.Api.BL;

public static class JwtManager
{
    public static (string Token, DateTime ExpiresAtUtc) CreateToken(User user, IConfiguration config)
    {
        var issuer = config["Jwt:Issuer"] ?? "Vela.Api";
        var audience = config["Jwt:Audience"] ?? "Vela.Client";
        var key = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var expiresMinutes = config.GetValue("Jwt:ExpiresMinutes", 480);
        var expiresAt = DateTime.UtcNow.AddMinutes(Math.Max(5, expiresMinutes));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.UniqueName, user.Name),
            new(ClaimTypes.Role, user.Role),
            new("is_admin", user.IsAdmin ? "true" : "false")
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return (encoded, expiresAt);
    }
}
