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

    public FavoriteSpotDto SaveFavorite(Guid userId, string spotId, double lat, double lon)
    {
        using var connection = _connectionFactory.CreateOpenConnection();
        using var getCommand = SqlStoredProcedureCommandBuilder.Create(
            "SP_GetFavoriteByUserAndSpot",
            connection,
            new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
            }
        );

        using (var reader = getCommand.ExecuteReader())
        {
            if (reader.Read())
            {
                return MapReaderToFavorite(reader);
            }
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
        };
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
        };
    }
}
