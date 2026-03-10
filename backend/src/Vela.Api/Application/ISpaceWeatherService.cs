using Vela.Api.DTOs;

namespace Vela.Api.Application;

public interface ISpaceWeatherService
{
    Task<SpaceWeatherRawSnapshotDto> GetSnapshotAsync(
        bool force,
        CancellationToken cancellationToken = default
    );
}
