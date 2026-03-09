using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class FavoriteSpot
{
    public static List<FavoriteSpotDto> GetByUserId(Guid userId)
    {
        FavoriteService favoriteService = new();
        return favoriteService.GetFavorites(userId);
    }

    public static FavoriteSpotDto Save(Guid userId, CreateFavoriteRequestDto request)
    {
        FavoriteService favoriteService = new();

        var spotId = string.IsNullOrWhiteSpace(request.SpotId)
            ? BuildSpotId(request.Lat, request.Lon)
            : request.SpotId.Trim();

        return favoriteService.SaveFavorite(userId, spotId, request.Lat, request.Lon);
    }

    public static bool Delete(Guid userId, string spotId)
    {
        FavoriteService favoriteService = new();
        return favoriteService.DeleteFavorite(userId, spotId.Trim());
    }

    private static string BuildSpotId(double lat, double lon)
    {
        return $"{lat:F6},{lon:F6}";
    }
}
