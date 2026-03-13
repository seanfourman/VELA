using System.Data;
using System.Data.SqlClient;
using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public sealed class SqlFavoriteRepository : IFavoriteRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SqlFavoriteRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public List<FavoriteSpotDto> GetFavorites(Guid userId)
    {
        var favorites = new List<FavoriteSpotDto>();

        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetFavoritesByUserId",
            connection,
            new Dictionary<string, object> { { "@UserId", userId } }
        );
        using var reader = command.ExecuteReader();

        while (reader.Read())
        {
            favorites.Add(MapReaderToFavorite(reader));
        }

        return favorites;
    }

    public FavoriteSpotDto SaveFavorite(
        Guid userId,
        string spotId,
        double lat,
        double lon,
        string? customName
    )
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        var existing = GetFavoriteByUserAndSpot(connection, userId, spotId.Trim());
        if (existing is not null)
        {
            return existing;
        }

        var createdAt = DateTime.UtcNow;
        using var insertCommand = SqlStoredProcedureCommandBuilder.Create(
            "SP_InsertFavorite",
            connection,
            new Dictionary<string, object>
            {
                { "@Id", Guid.NewGuid() },
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@Lat", lat },
                { "@Lon", lon },
                { "@CustomName", (object?)customName ?? DBNull.Value },
                { "@CreatedAtUtc", createdAt },
            }
        );
        insertCommand.ExecuteNonQuery();

        return new FavoriteSpotDto
        {
            SpotId = spotId.Trim(),
            Lat = lat,
            Lon = lon,
            CreatedAt = createdAt,
            CustomName = customName,
        };
    }

    public FavoriteSpotDto? UpdateFavorite(Guid userId, string spotId, string? customName)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_UpdateFavoriteCustomName",
            connection,
            new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@CustomName", (object?)customName ?? DBNull.Value },
            }
        );
        var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int)
        {
            Direction = ParameterDirection.Output,
        };
        command.Parameters.Add(affectedRowsParam);
        command.ExecuteNonQuery();

        if (Convert.ToInt32(affectedRowsParam.Value) <= 0)
        {
            return null;
        }

        return GetFavoriteByUserAndSpot(connection, userId, spotId.Trim());
    }

    public bool DeleteFavorite(Guid userId, string spotId)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var command = SqlStoredProcedureCommandBuilder.Create(
            "SP_DeleteFavorite",
            connection,
            new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
            }
        );
        var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int)
        {
            Direction = ParameterDirection.Output,
        };
        command.Parameters.Add(affectedRowsParam);

        command.ExecuteNonQuery();
        return Convert.ToInt32(affectedRowsParam.Value) > 0;
    }

    private static FavoriteSpotDto MapReaderToFavorite(SqlDataReader reader)
    {
        return new FavoriteSpotDto
        {
            SpotId = reader["SpotId"].ToString() ?? string.Empty,
            Lat = Convert.ToDouble(reader["Lat"]),
            Lon = Convert.ToDouble(reader["Lon"]),
            CreatedAt = Convert.ToDateTime(reader["CreatedAtUtc"]),
            CustomName = reader["CustomName"] == DBNull.Value
                ? null
                : reader["CustomName"].ToString(),
        };
    }

    private static FavoriteSpotDto? GetFavoriteByUserAndSpot(
        SqlConnection connection,
        Guid userId,
        string spotId
    )
    {
        using var getCommand = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetFavoriteByUserAndSpot",
            connection,
            new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId },
            }
        );

        using var reader = getCommand.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return MapReaderToFavorite(reader);
    }
}
