using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.Application;

public sealed class FavoriteService : IFavoriteService
{
    private readonly IFavoriteRepository _favoriteRepository;

    public FavoriteService(IFavoriteRepository favoriteRepository)
    {
        _favoriteRepository = favoriteRepository;
    }

    public List<FavoriteSpotDto> GetByUserId(Guid userId)
    {
        return _favoriteRepository.GetFavorites(userId);
    }

    public FavoriteSpotDto Save(Guid userId, CreateFavoriteRequestDto request)
    {
        var spotId = string.IsNullOrWhiteSpace(request.SpotId)
            ? BuildSpotId(request.Lat, request.Lon)
            : request.SpotId.Trim();

        return _favoriteRepository.SaveFavorite(
            userId,
            spotId,
            request.Lat,
            request.Lon,
            NormalizeCustomName(request.CustomName)
        );
    }

    public FavoriteSpotDto? Update(Guid userId, string spotId, UpdateFavoriteRequestDto request)
    {
        return _favoriteRepository.UpdateFavorite(
            userId,
            spotId.Trim(),
            NormalizeCustomName(request.CustomName)
        );
    }

    public bool Delete(Guid userId, string spotId)
    {
        return _favoriteRepository.DeleteFavorite(userId, spotId.Trim());
    }

    private static string BuildSpotId(double lat, double lon)
    {
        return $"{lat:F6},{lon:F6}";
    }

    private static string? NormalizeCustomName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
