using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.Application;

public sealed class RecommendationService : IRecommendationService
{
    private readonly IRecommendationRepository _recommendationRepository;

    public RecommendationService(IRecommendationRepository recommendationRepository)
    {
        _recommendationRepository = recommendationRepository;
    }

    public List<RecommendationDto> GetAll()
    {
        return _recommendationRepository.GetAll();
    }

    public RecommendationDto Save(UpsertRecommendationRequestDto request)
    {
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? BuildLocationId(request.Name, request.Coordinates.Lat, request.Coordinates.Lon)
            : request.Id.Trim();

        return _recommendationRepository.SaveRecommendation(id, request);
    }

    public bool Delete(string id)
    {
        return _recommendationRepository.DeleteRecommendation(id.Trim());
    }

    private static string BuildLocationId(string name, double lat, double lon)
    {
        var normalized = name.Trim().ToLowerInvariant();
        normalized = string.Join(
            "-",
            normalized.Split(
                [' ', '\t', '\n', '\r', ',', ';', ':', '|', '/', '\\'],
                StringSplitOptions.RemoveEmptyEntries
            )
        );

        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "spot";
        }

        return $"{normalized}-{lat:F3}-{lon:F3}".ToLowerInvariant();
    }
}
