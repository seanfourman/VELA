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
        services.AddMemoryCache();
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
        services.AddSingleton<IWorldAtlasService, WorldAtlasService>();
        services.AddHttpClient<ISpaceWeatherService, SpaceWeatherService>();
        services.AddHttpClient<IMapTilerProxyService, MapTilerProxyService>();
        services.AddHttpClient<IVisiblePlanetsService, VisiblePlanetsService>();

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
        var configuredOrigins =
            configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();
        var allowedOrigins = configuredOrigins
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (allowedOrigins.Length == 0)
        {
            allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
        }

        services.AddCors(options =>
        {
            options.AddPolicy(
                ClientCorsPolicyName,
                policy =>
                {
                    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
                }
            );
        });

        return services;
    }
}
