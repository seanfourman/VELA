using System.Data;
using System.Data.SqlClient;
using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public class FavoriteService : DBService
{
    public List<FavoriteSpotDto> GetFavorites(Guid userId)
    {
        var favorites = new List<FavoriteSpotDto>();
        SqlConnection? con = null;
        try
        {
            con = Connect();
            SqlCommand cmd = CreateCommand("SP_GetFavoritesByUserId", con,
                new Dictionary<string, object> { { "@UserId", userId } });
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    favorites.Add(MapReaderToFavorite(reader));
                }
            }
            return favorites;
        }
        finally { con?.Close(); }
    }

    public FavoriteSpotDto SaveFavorite(Guid userId, string spotId, double lat, double lon, string? customName)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var existing = GetFavoriteByUserAndSpot(con, userId, spotId.Trim());
            if (existing is not null) return existing;

            var createdAt = DateTime.UtcNow;
            var parameters = new Dictionary<string, object>
            {
                { "@Id", Guid.NewGuid() },
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@Lat", lat },
                { "@Lon", lon },
                { "@CustomName", (object?)customName ?? DBNull.Value },
                { "@CreatedAtUtc", createdAt },
            };
            SqlCommand cmd = CreateCommand("SP_InsertFavorite", con, parameters);
            cmd.ExecuteNonQuery();

            return new FavoriteSpotDto
            {
                SpotId = spotId.Trim(),
                Lat = lat,
                Lon = lon,
                CreatedAt = createdAt,
                CustomName = customName,
            };
        }
        finally { con?.Close(); }
    }

    public FavoriteSpotDto? UpdateFavorite(Guid userId, string spotId, string? customName)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
                { "@CustomName", (object?)customName ?? DBNull.Value },
            };
            SqlCommand cmd = CreateCommand("SP_UpdateFavoriteCustomName", con, parameters);
            var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(affectedRowsParam);
            cmd.ExecuteNonQuery();

            if (Convert.ToInt32(affectedRowsParam.Value) <= 0) return null;
            return GetFavoriteByUserAndSpot(con, userId, spotId.Trim());
        }
        finally { con?.Close(); }
    }

    public bool DeleteFavorite(Guid userId, string spotId)
    {
        SqlConnection? con = null;
        try
        {
            con = Connect();
            var parameters = new Dictionary<string, object>
            {
                { "@UserId", userId },
                { "@SpotId", spotId.Trim() },
            };
            SqlCommand cmd = CreateCommand("SP_DeleteFavorite", con, parameters);
            var affectedRowsParam = new SqlParameter("@AffectedRows", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(affectedRowsParam);
            cmd.ExecuteNonQuery();
            return Convert.ToInt32(affectedRowsParam.Value) > 0;
        }
        finally { con?.Close(); }
    }

    private static FavoriteSpotDto MapReaderToFavorite(SqlDataReader reader)
    {
        return new FavoriteSpotDto
        {
            SpotId = reader["SpotId"].ToString() ?? string.Empty,
            Lat = Convert.ToDouble(reader["Lat"]),
            Lon = Convert.ToDouble(reader["Lon"]),
            CreatedAt = Convert.ToDateTime(reader["CreatedAtUtc"]),
            CustomName = reader["CustomName"] == DBNull.Value ? null : reader["CustomName"].ToString(),
        };
    }

    private FavoriteSpotDto? GetFavoriteByUserAndSpot(SqlConnection con, Guid userId, string spotId)
    {
        var parameters = new Dictionary<string, object>
        {
            { "@UserId", userId },
            { "@SpotId", spotId },
        };
        SqlCommand cmd = CreateCommand("SP_GetFavoriteByUserAndSpot", con, parameters);
        using (var reader = cmd.ExecuteReader())
        {
            if (reader.Read()) return MapReaderToFavorite(reader);
        }
        return null;
    }
}
