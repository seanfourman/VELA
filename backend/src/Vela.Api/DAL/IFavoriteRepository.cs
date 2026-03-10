using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public interface IFavoriteRepository
{
    List<FavoriteSpotDto> GetFavorites(Guid userId);
    FavoriteSpotDto SaveFavorite(Guid userId, string spotId, double lat, double lon);
    bool DeleteFavorite(Guid userId, string spotId);
}
