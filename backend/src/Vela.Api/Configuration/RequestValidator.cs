using Vela.Api.Configuration;
using Vela.Api.DTOs;

namespace Vela.Api.Validators;

public static class RequestValidator
{
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
}
