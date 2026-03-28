using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class Favorite
{
    public static List<FavoriteSpotDto> GetByUserId(Guid userId)
    {
        var favoriteService = new FavoriteService();
        return favoriteService.GetFavorites(userId);
    }

    public static FavoriteSpotDto Save(Guid userId, CreateFavoriteRequestDto request)
    {
        var favoriteService = new FavoriteService();
        var spotId = string.IsNullOrWhiteSpace(request.SpotId)
            ? $"{request.Lat:F6},{request.Lon:F6}"
            : request.SpotId.Trim();

        return favoriteService.SaveFavorite(userId, spotId, request.Lat, request.Lon, NormalizeCustomName(request.CustomName));
    }

    public static FavoriteSpotDto? Update(Guid userId, string spotId, UpdateFavoriteRequestDto request)
    {
        var favoriteService = new FavoriteService();
        return favoriteService.UpdateFavorite(userId, spotId.Trim(), NormalizeCustomName(request.CustomName));
    }

    public static bool Delete(Guid userId, string spotId)
    {
        var favoriteService = new FavoriteService();
        return favoriteService.DeleteFavorite(userId, spotId.Trim());
    }

    private static string? NormalizeCustomName(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
