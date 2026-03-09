using System.Data.SqlClient;
using Vela.Api.BL;

namespace Vela.Api.DAL;

public class UserService : DBService
{
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
            CreatedAtUtc = Convert.ToDateTime(reader["CreatedAtUtc"])
        };
    }

    public User? GetUserByEmail(string email)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var sql = @"
SELECT TOP 1 Id, Email, Name, HashedPassword, IsAdmin, Role, CreatedAtUtc
FROM Users
WHERE Email = @Email;";

            var parameters = new Dictionary<string, object> { { "@Email", email.Trim().ToLowerInvariant() } };
            var cmd = CreateTextCommand(sql, con, parameters);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return MapReaderToUser(reader);
            }

            return null;
        }
        finally
        {
            con?.Close();
        }
    }

    public User? GetUserById(Guid id)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var sql = @"
SELECT TOP 1 Id, Email, Name, HashedPassword, IsAdmin, Role, CreatedAtUtc
FROM Users
WHERE Id = @Id;";

            var parameters = new Dictionary<string, object> { { "@Id", id } };
            var cmd = CreateTextCommand(sql, con, parameters);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return MapReaderToUser(reader);
            }

            return null;
        }
        finally
        {
            con?.Close();
        }
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

            var sql = @"
INSERT INTO Users (Id, Email, Name, HashedPassword, IsAdmin, Role, CreatedAtUtc)
VALUES (@Id, @Email, @Name, @HashedPassword, @IsAdmin, @Role, @CreatedAtUtc);";

            var parameters = new Dictionary<string, object>
            {
                { "@Id", id },
                { "@Email", user.Email.Trim().ToLowerInvariant() },
                { "@Name", user.Name.Trim() },
                { "@HashedPassword", user.HashedPassword },
                { "@IsAdmin", user.IsAdmin },
                { "@Role", role },
                { "@CreatedAtUtc", user.CreatedAtUtc == default ? DateTime.UtcNow : user.CreatedAtUtc }
            };

            var cmd = CreateTextCommand(sql, con, parameters);
            var affected = cmd.ExecuteNonQuery();
            return affected > 0 ? id : Guid.Empty;
        }
        catch
        {
            return Guid.Empty;
        }
        finally
        {
            con?.Close();
        }
    }

    public bool AnyAdminExists()
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var sql = "SELECT COUNT(1) FROM Users WHERE IsAdmin = 1;";
            var cmd = CreateTextCommand(sql, con, null);
            var count = Convert.ToInt32(cmd.ExecuteScalar());
            return count > 0;
        }
        finally
        {
            con?.Close();
        }
    }
}
