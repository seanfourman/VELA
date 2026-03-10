using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Vela.Api.Application;
using Vela.Api.DAL;

namespace Vela.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public const string ClientCorsPolicyName = "ClientCorsPolicy";

    public static IServiceCollection AddApiPresentation(this IServiceCollection services)
    {
        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();

        services.AddScoped<IFavoriteRepository, SqlFavoriteRepository>();
        services.AddScoped<IUserRepository, SqlUserRepository>();
        services.AddScoped<IRecommendationRepository, SqlRecommendationRepository>();
        services.AddScoped<IStarPartyEventRepository, SqlStarPartyEventRepository>();

        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRecommendationService, RecommendationService>();
        services.AddScoped<IStarPartyEventService, StarPartyEventService>();
        services.AddScoped<ITokenService, JwtTokenService>();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
        {
            throw new InvalidOperationException(
                "Jwt:Key must be configured with at least 32 characters."
            );
        }

        var issuer = configuration["Jwt:Issuer"] ?? "Vela.Api";
        var audience = configuration["Jwt:Audience"] ?? "Vela.Client";
        var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            });
        services.AddAuthorization();
        return services;
    }

    public static IServiceCollection AddConfiguredCors(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        var hasAllowedOrigins = allowedOrigins is { Length: > 0 };

        services.AddCors(options =>
        {
            options.AddPolicy(
                ClientCorsPolicyName,
                policy =>
                {
                    if (hasAllowedOrigins)
                    {
                        policy.WithOrigins(allowedOrigins!).AllowAnyHeader().AllowAnyMethod();
                        return;
                    }

                    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                }
            );
        });

        return services;
    }
}
