using Vela.Api.DTOs;

namespace Vela.Api.Application;

public interface IFavoriteService
{
    List<FavoriteSpotDto> GetByUserId(Guid userId);
    FavoriteSpotDto Save(Guid userId, CreateFavoriteRequestDto request);
    FavoriteSpotDto? Update(Guid userId, string spotId, UpdateFavoriteRequestDto request);
    bool Delete(Guid userId, string spotId);
}
