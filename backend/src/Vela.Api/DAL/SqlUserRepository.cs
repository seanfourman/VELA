using System.Data;
using System.Data.SqlClient;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public sealed class SqlUserRepository : IUserRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SqlUserRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public User? GetUserByEmail(string email)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetUserByEmail",
            connection,
            new Dictionary<string, object> { { "@Email", email.Trim().ToLowerInvariant() } }
        );
        using var reader = command.ExecuteReader();
        return reader.Read() ? MapReaderToUser(reader) : null;
    }

    public User? GetUserById(Guid id)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetUserById",
            connection,
            new Dictionary<string, object> { { "@Id", id } }
        );
        using var reader = command.ExecuteReader();
        return reader.Read() ? MapReaderToUser(reader) : null;
    }

    public Guid InsertUser(User user)
    {
        try
        {
            using var connection = _connectionFactory.CreateOpenConnection();
            var id = user.Id == Guid.Empty ? Guid.NewGuid() : user.Id;
            var role = string.IsNullOrWhiteSpace(user.Role)
                ? (user.IsAdmin ? "admin" : "user")
                : user.Role.Trim().ToLowerInvariant();

            using var command = SqlStoredProcedureCommandBuilder.Create(
                "SP_InsertUser",
                connection,
                new Dictionary<string, object>
                {
                    { "@Id", id },
                    { "@Email", user.Email.Trim().ToLowerInvariant() },
                    { "@Name", user.Name.Trim() },
                    { "@HashedPassword", user.HashedPassword },
                    { "@IsAdmin", user.IsAdmin },
                    { "@Role", role },
                    {
                        "@DisplayName",
                        string.IsNullOrWhiteSpace(user.DisplayName)
                            ? user.Name.Trim()
                            : user.DisplayName.Trim()
                    },
                    {
                        "@AvatarUrl",
                        string.IsNullOrWhiteSpace(user.AvatarUrl)
                            ? DBNull.Value
                            : user.AvatarUrl.Trim()
                    },
                    {
                        "@Bio",
                        string.IsNullOrWhiteSpace(user.Bio)
                            ? DBNull.Value
                            : user.Bio.Trim()
                    },
                    {
                        "@CreatedAtUtc",
                        user.CreatedAtUtc == default ? DateTime.UtcNow : user.CreatedAtUtc
                    },
                }
            );
            command.ExecuteNonQuery();
            return id;
        }
        catch
        {
            return Guid.Empty;
        }
    }

    public UserProfileDto? GetUserProfile(Guid userId)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetUserProfile",
            connection,
            new Dictionary<string, object> { { "@Id", userId } }
        );
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new UserProfileDto
        {
            DisplayName = ReadSafeString(reader, "DisplayName"),
            AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
            Bio = ReadSafeString(reader, "Bio"),
        };
    }

    public UserProfileDto? UpdateUserProfile(Guid userId, UpdateUserProfileRequestDto request)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_UpdateUserProfile",
            connection,
            new Dictionary<string, object>
            {
                { "@Id", userId },
                {
                    "@DisplayName",
                    string.IsNullOrWhiteSpace(request.DisplayName)
                        ? DBNull.Value
                        : request.DisplayName.Trim()
                },
                {
                    "@AvatarUrl",
                    string.IsNullOrWhiteSpace(request.AvatarUrl)
                        ? DBNull.Value
                        : request.AvatarUrl.Trim()
                },
                {
                    "@Bio",
                    string.IsNullOrWhiteSpace(request.Bio)
                        ? DBNull.Value
                        : request.Bio.Trim()
                },
            }
        );
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new UserProfileDto
        {
            DisplayName = ReadSafeString(reader, "DisplayName"),
            AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
            Bio = ReadSafeString(reader, "Bio"),
        };
    }

    public List<AdminManagedUserDto> GetManagedUsers()
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetAdminUsers",
            connection,
            new Dictionary<string, object>()
        );
        using var reader = command.ExecuteReader();
        var users = new List<AdminManagedUserDto>();

        while (reader.Read())
        {
            users.Add(MapReaderToManagedUser(reader));
        }

        return users;
    }

    public User? UpdateUserAccess(Guid userId, bool isAdmin, string role)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_UpdateUserAccess",
            connection,
            new Dictionary<string, object>
            {
                { "@Id", userId },
                { "@IsAdmin", isAdmin },
                { "@Role", role.Trim().ToLowerInvariant() },
            }
        );
        using var reader = command.ExecuteReader();
        return reader.Read() ? MapReaderToUser(reader) : null;
    }

    public int GetAdminCount()
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_AnyAdminExists",
            connection,
            new Dictionary<string, object>()
        );
        var result = command.ExecuteScalar();
        if (result == null || result == DBNull.Value)
        {
            return 0;
        }

        return Convert.ToInt32(result);
    }

    private static string ReadSafeString(SqlDataReader reader, string columnName)
    {
        var value = reader[columnName];
        return value == DBNull.Value ? string.Empty : value.ToString() ?? string.Empty;
    }

    private static AdminManagedUserDto MapReaderToManagedUser(SqlDataReader reader)
    {
        return new AdminManagedUserDto
        {
            Id = reader["Id"].ToString() ?? string.Empty,
            Email = reader["Email"].ToString() ?? string.Empty,
            Name = reader["Name"].ToString() ?? string.Empty,
            DisplayName = ReadSafeString(reader, "DisplayName"),
            AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
            Bio = ReadSafeString(reader, "Bio"),
            Role = reader["Role"].ToString() ?? "user",
            IsAdmin = Convert.ToBoolean(reader["IsAdmin"]),
            CreatedAtUtc = Convert.ToDateTime(reader["CreatedAtUtc"]),
        };
    }

    private static User MapReaderToUser(SqlDataReader reader)
    {
        return new User
        {
            Id = (Guid)reader["Id"],
            Email = reader["Email"].ToString() ?? string.Empty,
            Name = reader["Name"].ToString() ?? string.Empty,
            HashedPassword = reader["HashedPassword"].ToString() ?? string.Empty,
            IsAdmin = Convert.ToBoolean(reader["IsAdmin"]),
            Role = reader["Role"].ToString() ?? "user",
            DisplayName = ReadSafeString(reader, "DisplayName"),
            AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
            Bio = ReadSafeString(reader, "Bio"),
            CreatedAtUtc = Convert.ToDateTime(reader["CreatedAtUtc"]),
        };
    }
}
