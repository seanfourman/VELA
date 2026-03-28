using Vela.Api.DAL;
using Vela.Api.DTOs;

namespace Vela.Api.BL;

public class Recommendation
{
    public static List<RecommendationDto> GetAll()
    {
        var recommendationService = new RecommendationService();
        return recommendationService.GetAll();
    }

    public static RecommendationDto Save(UpsertRecommendationRequestDto request)
    {
        var recommendationService = new RecommendationService();
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? BuildLocationId(request.Name, request.Coordinates.Lat, request.Coordinates.Lon)
            : request.Id.Trim();

        return recommendationService.SaveRecommendation(id, request);
    }

    public static bool Delete(string id)
    {
        var recommendationService = new RecommendationService();
        return recommendationService.DeleteRecommendation(id.Trim());
    }

    private static string BuildLocationId(string name, double lat, double lon)
    {
        var normalized = name.Trim().ToLowerInvariant();
        normalized = string.Join("-", normalized.Split(
            [' ', '\t', '\n', '\r', ',', ';', ':', '|', '/', '\\'],
            StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrWhiteSpace(normalized)) normalized = "spot";
        return $"{normalized}-{lat:F3}-{lon:F3}".ToLowerInvariant();
    }
}
