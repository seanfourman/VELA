using Vela.Api.DTOs;
using Vela.Api.Models;

namespace Vela.Api.DAL;

public interface IStarPartyEventRepository
{
    List<StarPartyEventDto> GetAllEvents();
    StarPartyEventDto UpsertEvent(UpsertStarPartyEventRequestDto request, User hostUser);
    StarPartyEventDto? SetStatus(string eventId, string status);
    bool DeleteEvent(string eventId);
    (StarPartyEventDto? Event, bool Joined) ToggleRsvp(string eventId, User user);
}
