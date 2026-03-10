using Vela.Api.DTOs;

namespace Vela.Api.Application;

public interface IRecommendationService
{
    List<RecommendationDto> GetAll();
    RecommendationDto Save(UpsertRecommendationRequestDto request);
    bool Delete(string id);
}
