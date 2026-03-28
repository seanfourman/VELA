using System.Data;
using System.Data.SqlClient;
using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public class UserService : DBService
{
    public User? GetUserByEmail(string email)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object> { { "@Email", email.Trim().ToLowerInvariant() } };
            SqlCommand cmd = CreateCommand("SP_GetUserByEmail", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read()) return MapReaderToUser(reader);
            }
            return null;
        }
        finally { con?.Close(); }
    }

    public User? GetUserById(Guid id)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object> { { "@Id", id } };
            SqlCommand cmd = CreateCommand("SP_GetUserById", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read()) return MapReaderToUser(reader);
            }
            return null;
        }
        finally { con?.Close(); }
    }

    public Guid InsertUser(User user)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var id = user.Id == Guid.Empty ? Guid.NewGuid() : user.Id;
            var role = string.IsNullOrWhiteSpace(user.Role)
                ? (user.IsAdmin ? "admin" : "user")
                : user.Role.Trim().ToLowerInvariant();

            var parameters = new Dictionary<string, object>
            {
                { "@Id", id },
                { "@Email", user.Email.Trim().ToLowerInvariant() },
                { "@Name", user.Name.Trim() },
                { "@HashedPassword", user.HashedPassword },
                { "@IsAdmin", user.IsAdmin },
                { "@Role", role },
                { "@DisplayName", string.IsNullOrWhiteSpace(user.DisplayName) ? user.Name.Trim() : user.DisplayName.Trim() },
                { "@AvatarUrl", string.IsNullOrWhiteSpace(user.AvatarUrl) ? DBNull.Value : user.AvatarUrl.Trim() },
                { "@Bio", string.IsNullOrWhiteSpace(user.Bio) ? DBNull.Value : user.Bio.Trim() },
                { "@CreatedAtUtc", user.CreatedAtUtc == default ? DateTime.UtcNow : user.CreatedAtUtc },
            };

            SqlCommand cmd = CreateCommand("SP_InsertUser", con, parameters);
            cmd.ExecuteNonQuery();
            return id;
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        {
            return Guid.Empty;
        }
        finally { con?.Close(); }
    }

    public UserProfileDto? GetUserProfile(Guid userId)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object> { { "@Id", userId } };
            SqlCommand cmd = CreateCommand("SP_GetUserProfile", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (!reader.Read()) return null;
                return new UserProfileDto
                {
                    DisplayName = ReadSafeString(reader, "DisplayName"),
                    AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
                    Bio = ReadSafeString(reader, "Bio"),
                };
            }
        }
        finally { con?.Close(); }
    }

    public UserProfileDto? UpdateUserProfile(Guid userId, UpdateUserProfileRequestDto request)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@Id", userId },
                { "@DisplayName", string.IsNullOrWhiteSpace(request.DisplayName) ? DBNull.Value : request.DisplayName.Trim() },
                { "@AvatarUrl", string.IsNullOrWhiteSpace(request.AvatarUrl) ? DBNull.Value : request.AvatarUrl.Trim() },
                { "@Bio", string.IsNullOrWhiteSpace(request.Bio) ? DBNull.Value : request.Bio.Trim() },
            };
            SqlCommand cmd = CreateCommand("SP_UpdateUserProfile", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (!reader.Read()) return null;
                return new UserProfileDto
                {
                    DisplayName = ReadSafeString(reader, "DisplayName"),
                    AvatarUrl = ReadSafeString(reader, "AvatarUrl"),
                    Bio = ReadSafeString(reader, "Bio"),
                };
            }
        }
        finally { con?.Close(); }
    }

    public List<AdminManagedUserDto> GetManagedUsers()
    {
        var users = new List<AdminManagedUserDto>();
        SqlConnection? con = null;
        try
        {
            con = Connect();
            SqlCommand cmd = CreateCommand("SP_GetAdminUsers", con, new Dictionary<string, object>());
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    users.Add(MapReaderToManagedUser(reader));
                }
            }
            return users;
        }
        finally { con?.Close(); }
    }

    public User? UpdateUserAccess(Guid userId, bool isAdmin, string role)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@Id", userId },
                { "@IsAdmin", isAdmin },
                { "@Role", role.Trim().ToLowerInvariant() },
            };
            SqlCommand cmd = CreateCommand("SP_UpdateUserAccess", con, parameters);
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read()) return MapReaderToUser(reader);
            }
            return null;
        }
        finally { con?.Close(); }
    }

    public int GetAdminCount()
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            SqlCommand cmd = CreateCommand("SP_AnyAdminExists", con, new Dictionary<string, object>());
            var result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value) return 0;
            return Convert.ToInt32(result);
        }
        finally { con?.Close(); }
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
