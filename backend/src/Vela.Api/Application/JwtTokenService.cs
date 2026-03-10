using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Vela.Api.Models;

namespace Vela.Api.Application;

public sealed class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "Vela.Api";
        var audience = _configuration["Jwt:Audience"] ?? "Vela.Client";
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var expiresMinutes = _configuration.GetValue("Jwt:ExpiresMinutes", 480);
        var expiresAt = DateTime.UtcNow.AddMinutes(Math.Max(5, expiresMinutes));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.UniqueName, user.Name),
            new(ClaimTypes.Role, user.Role),
            new("is_admin", user.IsAdmin ? "true" : "false"),
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
