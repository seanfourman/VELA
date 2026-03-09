using Vela.Api.Configuration;
using Vela.Api.DTOs;

namespace Vela.Api.Validators;

public static class RequestValidator
{
    private static readonly HashSet<string> AllowedEventTypes = new(
        ["party", "special_event"],
        StringComparer.OrdinalIgnoreCase
    );

    private static readonly HashSet<string> AllowedEventStatuses = new(
        ["draft", "published", "archived"],
        StringComparer.OrdinalIgnoreCase
    );

    public static List<string> ValidateRegistrationRequest(RegisterRequestDto request)
    {
        var errors = new List<string>();

        if (
            string.IsNullOrWhiteSpace(request.Email)
            || !ValidationConfig.ValidationRegex.Email.IsMatch(request.Email.Trim())
        )
        {
            errors.Add("A valid email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors.Add("Password is required.");
        }
        else if (request.Password.Length < ValidationConfig.PasswordRequirements.MinLength)
        {
            errors.Add(
                $"Password must be at least {ValidationConfig.PasswordRequirements.MinLength} characters."
            );
        }

        return errors;
    }

    public static List<string> ValidateFavoriteRequest(CreateFavoriteRequestDto request)
    {
        var errors = new List<string>();

        if (!double.IsFinite(request.Lat) || !double.IsFinite(request.Lon))
        {
            errors.Add("Valid lat/lon are required.");
        }

        return errors;
    }

    public static List<string> ValidateRecommendationRequest(
        UpsertRecommendationRequestDto request
    )
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors.Add("name is required.");
        }

        if (
            request.Coordinates is null
            || !double.IsFinite(request.Coordinates.Lat)
            || !double.IsFinite(request.Coordinates.Lon)
        )
        {
            errors.Add("Valid coordinates are required.");
        }

        return errors;
    }

    public static List<string> ValidateStarPartyEventRequest(UpsertStarPartyEventRequestDto request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors.Add("Event title is required.");
        }

        if (request.StartsAt == default)
        {
            errors.Add("Event start time is required.");
        }

        if (!double.IsFinite(request.Lat) || request.Lat < -90 || request.Lat > 90)
        {
            errors.Add("Latitude must be between -90 and 90.");
        }

        if (!double.IsFinite(request.Lng) || request.Lng < -180 || request.Lng > 180)
        {
            errors.Add("Longitude must be between -180 and 180.");
        }

        if (request.EndsAt.HasValue && request.EndsAt.Value < request.StartsAt)
        {
            errors.Add("Event end time must be after start time.");
        }

        var eventType = (request.EventType ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(eventType) && !AllowedEventTypes.Contains(eventType))
        {
            errors.Add("eventType must be one of: party, special_event.");
        }

        var status = (request.Status ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(status) && !AllowedEventStatuses.Contains(status))
        {
            errors.Add("status must be one of: draft, published, archived.");
        }

        return errors;
    }

    public static List<string> ValidateStarPartyEventStatusRequest(
        SetStarPartyEventStatusRequestDto request
    )
    {
        var errors = new List<string>();
        var status = (request.Status ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(status))
        {
            errors.Add("status is required.");
            return errors;
        }

        if (!AllowedEventStatuses.Contains(status))
        {
            errors.Add("status must be one of: draft, published, archived.");
        }

        return errors;
    }

    public static List<string> ValidateUserProfileRequest(UpdateUserProfileRequestDto request)
    {
        var errors = new List<string>();

        var displayName = (request.DisplayName ?? string.Empty).Trim();
        if (displayName.Length > 120)
        {
            errors.Add("displayName must be at most 120 characters.");
        }

        var avatarUrl = (request.AvatarUrl ?? string.Empty).Trim();
        if (avatarUrl.Length > 500)
        {
            errors.Add("avatarUrl must be at most 500 characters.");
        }
        else if (!string.IsNullOrWhiteSpace(avatarUrl))
        {
            if (
                !Uri.TryCreate(avatarUrl, UriKind.Absolute, out var parsed)
                || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
            )
            {
                errors.Add("avatarUrl must be a valid http(s) URL.");
            }
        }

        var bio = (request.Bio ?? string.Empty).Trim();
        if (bio.Length > 500)
        {
            errors.Add("bio must be at most 500 characters.");
        }

        return errors;
    }
}
