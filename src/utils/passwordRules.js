export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordChecks(password) {
  const value = String(password || "");
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
}

export function isStrongPassword(password) {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}

export function getPasswordValidationError(password) {
  const checks = getPasswordChecks(password);
  if (checks.length && checks.lowercase && checks.uppercase && checks.number && checks.symbol) {
    return "";
  }

  if (!checks.length) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!checks.lowercase) {
    return "Password must include at least one lowercase letter.";
  }
  if (!checks.uppercase) {
    return "Password must include at least one uppercase letter.";
  }
  if (!checks.number) {
    return "Password must include at least one number.";
  }
  if (!checks.symbol) {
    return "Password must include at least one symbol.";
  }
  return "Password does not meet requirements.";
}
