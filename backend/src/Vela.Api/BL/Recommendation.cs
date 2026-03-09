using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class Recommendation
{
    public static List<RecommendationDto> GetAll()
    {
        RecommendationService recommendationService = new();
        return recommendationService.GetAll();
    }

    public static RecommendationDto Save(UpsertRecommendationRequestDto request)
    {
        RecommendationService recommendationService = new();
        return recommendationService.SaveRecommendation(request);
    }

    public static bool Delete(string id)
    {
        RecommendationService recommendationService = new();
        return recommendationService.DeleteRecommendation(id);
    }

    public static string BuildLocationId(string name, double lat, double lon)
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
