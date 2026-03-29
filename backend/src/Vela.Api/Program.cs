using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Vela.Api.Application;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Keep enum values stable for the JS client instead of serializing raw integers.
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT authentication (needed for [Authorize] on controllers)
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-only-jwt-key-change-before-production-1234567890";
var issuer = builder.Configuration["Jwt:Issuer"] ?? "Vela.Api";
var audience = builder.Configuration["Jwt:Audience"] ?? "Vela.Client";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // The API issues its own compact JWTs, so validation stays strict and predictable here.
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

// Infrastructure services (proxy services that need HttpClient/cache)
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<WorldAtlasService>();
builder.Services.AddHttpClient<MapTilerProxyService>();
builder.Services.AddHttpClient<VisiblePlanetsService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// The frontend can be hosted separately, so the API keeps CORS permissive for now.
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
