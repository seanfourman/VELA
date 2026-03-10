namespace Vela.Api.Application;

public interface IVisiblePlanetsService
{
    Task<VisiblePlanetsProxyResponse> GetAsync(
        double lat,
        double lon,
        CancellationToken cancellationToken = default
    );
}
