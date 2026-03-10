using Vela.Api.DTOs;

namespace Vela.Api.Application;

public interface IWorldAtlasService
{
    SkyQualityResponseDto GetSkyQuality(double lat, double lon);
    DarkSpotsResponseDto GetDarkSpots(double lat, double lon, double searchDistanceKm);
    Task<LightmapTileResponse> GetLightTileAsync(
        int z,
        int x,
        int y,
        CancellationToken cancellationToken = default
    );
}
