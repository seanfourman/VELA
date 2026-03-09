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
            var sql = @"
SELECT SpotId, Lat, Lon, CreatedAtUtc
FROM Favorites
WHERE UserId = @UserId
ORDER BY CreatedAtUtc DESC;";

            var parameters = new Dictionary<string, object> { { "@UserId", userId } };
            var cmd = CreateTextCommand(sql, con, parameters);

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

            var getSql = @"
SELECT TOP 1 SpotId, Lat, Lon, CreatedAtUtc
FROM Favorites
WHERE UserId = @UserId AND SpotId = @SpotId;";

            var getParams = new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() }
            };

            var getCmd = CreateTextCommand(getSql, con, getParams);
            using (var reader = getCmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    return MapReaderToFavorite(reader);
                }
            }

            var createdAt = DateTime.UtcNow;
            var insertSql = @"
INSERT INTO Favorites (Id, UserId, SpotId, Lat, Lon, CreatedAtUtc)
VALUES (@Id, @UserId, @SpotId, @Lat, @Lon, @CreatedAtUtc);";

            var insertParams = new Dictionary<string, object>
            {
                { "@Id", Guid.NewGuid() },
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@Lat", lat },
                { "@Lon", lon },
                { "@CreatedAtUtc", createdAt }
            };

            var insertCmd = CreateTextCommand(insertSql, con, insertParams);
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
            var sql = @"
DELETE FROM Favorites
WHERE UserId = @UserId AND SpotId = @SpotId;";

            var parameters = new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() }
            };

            var cmd = CreateTextCommand(sql, con, parameters);
            return cmd.ExecuteNonQuery() > 0;
        }
        finally
        {
            con?.Close();
        }
    }
}
