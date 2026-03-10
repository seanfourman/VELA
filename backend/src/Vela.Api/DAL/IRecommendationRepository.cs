using Vela.Api.DTOs;

namespace Vela.Api.DAL;

public interface IRecommendationRepository
{
    List<RecommendationDto> GetAll();
    RecommendationDto SaveRecommendation(string id, UpsertRecommendationRequestDto request);
    bool DeleteRecommendation(string id);
}
