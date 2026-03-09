using System.Text.RegularExpressions;

namespace Vela.Api.Configuration;

public static class ValidationConfig
{
    public static class PasswordRequirements
    {
        public const int MinLength = 8;
    }

    public static class ValidationRegex
    {
        public static readonly Regex Email = new(
            @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            RegexOptions.Compiled
        );
    }
}
