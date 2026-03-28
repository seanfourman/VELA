using Vela.Api.DAL;
using Vela.Api.DTOs;
using UserModel = Vela.Api.Models.User;

namespace Vela.Api.BL;

public class StarPartyEvent
{
    private static readonly HashSet<string> AllowedEventTypes = new(["party", "special_event"], StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> AllowedStatuses = new(["draft", "published", "archived"], StringComparer.OrdinalIgnoreCase);

    public static List<StarPartyEventDto> GetAll()
    {
        var starPartyEventService = new StarPartyEventService();
        return starPartyEventService.GetAllEvents();
    }

    public static StarPartyEventDto Save(UpsertStarPartyEventRequestDto request, UserModel hostUser)
    {
        var starPartyEventService = new StarPartyEventService();
        var normalizedStartsAt = request.StartsAt.ToUniversalTime();
        var normalizedEndsAt = request.EndsAt?.ToUniversalTime();
        var normalizedTitle = request.Title.Trim();
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? BuildEventId(normalizedTitle, normalizedStartsAt)
            : request.Id.Trim();

        var payload = new UpsertStarPartyEventRequestDto
        {
            Id = id,
            Title = normalizedTitle,
            EventType = NormalizeEventType(request.EventType),
            Status = NormalizeStatus(request.Status),
            StartsAt = normalizedStartsAt,
            EndsAt = normalizedEndsAt,
            Lat = request.Lat,
            Lng = request.Lng,
            MeetupDetails = NormalizeNullableText(request.MeetupDetails),
            Description = NormalizeNullableText(request.Description),
            HostChecklist = NormalizeChecklist(request.HostChecklist),
        };

        return starPartyEventService.UpsertEvent(payload, hostUser);
    }

    public static StarPartyEventDto? SetStatus(string id, string status)
    {
        var starPartyEventService = new StarPartyEventService();
        return starPartyEventService.SetStatus(id.Trim(), NormalizeStatus(status));
    }

    public static bool Delete(string id)
    {
        var starPartyEventService = new StarPartyEventService();
        return starPartyEventService.DeleteEvent(id.Trim());
    }

    public static (StarPartyEventDto? Event, bool Joined) ToggleRsvp(string id, UserModel user)
    {
        var starPartyEventService = new StarPartyEventService();
        return starPartyEventService.ToggleRsvp(id.Trim(), user);
    }

    private static string NormalizeEventType(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return AllowedEventTypes.Contains(normalized) ? normalized : "party";
    }

    private static string NormalizeStatus(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return AllowedStatuses.Contains(normalized) ? normalized : "draft";
    }

    private static string? NormalizeNullableText(string? value)
    {
        var normalized = (value ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static List<string> NormalizeChecklist(IEnumerable<string>? values)
    {
        return (values ?? [])
            .Select(v => (v ?? string.Empty).Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(24)
            .ToList();
    }

    private static string BuildEventId(string title, DateTime startsAtUtc)
    {
        var titleSlug = Slugify(title);
        var dateSlug = startsAtUtc.ToString("yyyyMMdd");
        var baseSlug = string.IsNullOrWhiteSpace(titleSlug) ? "event" : titleSlug;
        return $"event_{baseSlug}_{dateSlug}".ToLowerInvariant();
    }

    private static string Slugify(string value)
    {
        var lower = (value ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(lower)) return string.Empty;
        var safeChars = lower.Select(ch => char.IsLetterOrDigit(ch) ? ch : '_').ToArray();
        var slug = new string(safeChars);
        while (slug.Contains("__", StringComparison.Ordinal))
            slug = slug.Replace("__", "_", StringComparison.Ordinal);
        return slug.Trim('_');
    }
}
