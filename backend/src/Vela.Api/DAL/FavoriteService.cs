using System.Data.SqlClient;
using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public class FavoriteService : DBService
{
    private static FavoriteSpotDto MapReaderToFavorite(SqlDataReader reader)
    {
        return new FavoriteSpotDto
        {
            SpotId = reader["SpotId"].ToString() ?? string.Empty,
            Lat = Convert.ToDouble(reader["Lat"]),
            Lon = Convert.ToDouble(reader["Lon"]),
            CreatedAt = Convert.ToDateTime(reader["CreatedAtUtc"])
        };
    }

    public List<FavoriteSpotDto> GetFavorites(Guid userId)
    {
        var favorites = new List<FavoriteSpotDto>();
        SqlConnection? con = null;

        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object> { { "@UserId", userId } };
            var cmd = CreateCommand("SP_GetFavoritesByUserId", con, parameters);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                favorites.Add(MapReaderToFavorite(reader));
            }

            return favorites;
        }
        finally
        {
            con?.Close();
        }
    }

    public FavoriteSpotDto SaveFavorite(Guid userId, string spotId, double lat, double lon)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();

            var getParams = new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() }
            };

            var getCmd = CreateCommand("SP_GetFavoriteByUserAndSpot", con, getParams);
            using (var reader = getCmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    return MapReaderToFavorite(reader);
                }
            }

            var createdAt = DateTime.UtcNow;
            var insertParams = new Dictionary<string, object>
            {
                { "@Id", Guid.NewGuid() },
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@Lat", lat },
                { "@Lon", lon },
                { "@CreatedAtUtc", createdAt }
            };

            var insertCmd = CreateCommand("SP_InsertFavorite", con, insertParams);
            insertCmd.ExecuteNonQuery();

            return new FavoriteSpotDto
            {
                SpotId = spotId.Trim(),
                Lat = lat,
                Lon = lon,
                CreatedAt = createdAt
            };
        }
        finally
        {
            con?.Close();
        }
    }

    public bool DeleteFavorite(Guid userId, string spotId)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var cmd = CreateCommand(
                "SP_DeleteFavorite",
                con,
                new Dictionary<string, object>
                {
                    { "@UserId", userId },
                    { "@SpotId", spotId.Trim() }
                }
            );
            var affectedRowsParam = new SqlParameter("@AffectedRows", System.Data.SqlDbType.Int)
            {
                Direction = System.Data.ParameterDirection.Output
            };
            cmd.Parameters.Add(affectedRowsParam);

            cmd.ExecuteNonQuery();
            return Convert.ToInt32(affectedRowsParam.Value) > 0;
        }
        finally
        {
            con?.Close();
        }
    }
}
