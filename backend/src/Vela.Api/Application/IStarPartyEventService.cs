using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.Application;

public interface IStarPartyEventService
{
    List<StarPartyEventDto> GetAll();
    StarPartyEventDto Save(UpsertStarPartyEventRequestDto request, User hostUser);
    StarPartyEventDto? SetStatus(string id, string status);
    bool Delete(string id);
    (StarPartyEventDto? Event, bool Joined) ToggleRsvp(string id, User user);
}
