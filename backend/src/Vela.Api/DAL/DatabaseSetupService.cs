using System.Data.SqlClient;
using Vela.Api.BL;

namespace Vela.Api.DAL;

public class DatabaseSetupService : DBService
{
    public void Initialize(IConfiguration configuration, IWebHostEnvironment environment)
    {
        EnsureDatabaseExists(configuration);
        EnsureTables();
        SeedAdminUser(configuration);
        SeedRecommendations(environment);
    }

    private static string ResolveConnectionString(IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("myProjDB")
            ?? configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Missing connection string. Configure ConnectionStrings:myProjDB (or DefaultConnection) in appsettings.json."
            );
        }

        return connectionString;
    }

    private static void EnsureDatabaseExists(IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);
        var builder = new SqlConnectionStringBuilder(connectionString);

        var dbName = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(dbName))
        {
            return;
        }

        var escapedDbNameLiteral = dbName.Replace("'", "''");
        var escapedDbNameBracket = dbName.Replace("]", "]]");

        builder.InitialCatalog = "master";
        using var con = new SqlConnection(builder.ConnectionString);
        con.Open();

        var sql = $"IF DB_ID(N'{escapedDbNameLiteral}') IS NULL CREATE DATABASE [{escapedDbNameBracket}];";
        using var cmd = new SqlCommand(sql, con);
        cmd.ExecuteNonQuery();
    }

    private void EnsureTables()
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var sql = @"
IF OBJECT_ID(N'Users', N'U') IS NULL
BEGIN
    CREATE TABLE Users
    (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Name NVARCHAR(120) NOT NULL,
        HashedPassword NVARCHAR(255) NOT NULL,
        IsAdmin BIT NOT NULL CONSTRAINT DF_Users_IsAdmin DEFAULT(0),
        Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT('user'),
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAtUtc DEFAULT(SYSUTCDATETIME())
    );
END;

IF OBJECT_ID(N'Favorites', N'U') IS NULL
BEGIN
    CREATE TABLE Favorites
    (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        SpotId NVARCHAR(200) NOT NULL,
        Lat FLOAT NOT NULL,
        Lon FLOAT NOT NULL,
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Favorites_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT FK_Favorites_Users FOREIGN KEY(UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Favorites_UserId_SpotId' AND object_id = OBJECT_ID(N'Favorites'))
BEGIN
    CREATE UNIQUE INDEX IX_Favorites_UserId_SpotId ON Favorites(UserId, SpotId);
END;

IF OBJECT_ID(N'Recommendations', N'U') IS NULL
BEGIN
    CREATE TABLE Recommendations
    (
        Id NVARCHAR(200) NOT NULL PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Country NVARCHAR(120) NULL,
        Region NVARCHAR(120) NULL,
        [Type] NVARCHAR(80) NULL,
        Description NVARCHAR(MAX) NULL,
        BestTime NVARCHAR(120) NULL,
        Lat FLOAT NOT NULL,
        Lon FLOAT NOT NULL,
        PhotoUrlsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Recommendations_PhotoUrlsJson DEFAULT('[]'),
        SourceUrlsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Recommendations_SourceUrlsJson DEFAULT('[]'),
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Recommendations_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Recommendations_UpdatedAtUtc DEFAULT(SYSUTCDATETIME())
    );
END;";

            var cmd = CreateTextCommand(sql, con, null);
            cmd.ExecuteNonQuery();
        }
        finally
        {
            con?.Close();
        }
    }

    private void SeedAdminUser(IConfiguration configuration)
    {
        var adminService = new UserService();
        if (adminService.AnyAdminExists())
        {
            return;
        }

        var email = configuration["SeedAdmin:Email"]?.Trim().ToLowerInvariant();
        var password = configuration["SeedAdmin:Password"]?.Trim();
        var displayName = configuration["SeedAdmin:DisplayName"]?.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = string.IsNullOrWhiteSpace(displayName) ? "Admin" : displayName,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(password),
            IsAdmin = true,
            Role = "admin",
            CreatedAtUtc = DateTime.UtcNow
        };

        adminService.InsertUser(adminUser);
    }

    private static string ResolveRecommendationsPath(string contentRootPath)
    {
        var candidates = new[]
        {
            Path.Combine(contentRootPath, "..", "..", "..", "data", "stargazing_locations.json"),
            Path.Combine(contentRootPath, "..", "..", "..", "..", "data", "stargazing_locations.json")
        };

        foreach (var candidate in candidates)
        {
            var fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }
        }

        return string.Empty;
    }

    private static void SeedRecommendations(IWebHostEnvironment environment)
    {
        var filePath = ResolveRecommendationsPath(environment.ContentRootPath);
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return;
        }

        RecommendationService recommendationService = new();
        recommendationService.SeedRecommendationsFromFileIfEmpty(filePath);
    }
}
