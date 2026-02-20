const PASSWORD_MIN_LENGTH = 8;

const RULES = [
  [
    "length",
    (value) => value.length >= PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  ],
  ["lowercase", (value) => /[a-z]/.test(value), "Password must include at least one lowercase letter."],
  ["uppercase", (value) => /[A-Z]/.test(value), "Password must include at least one uppercase letter."],
  ["number", (value) => /\d/.test(value), "Password must include at least one number."],
  ["symbol", (value) => /[^A-Za-z0-9]/.test(value), "Password must include at least one symbol."],
];

const normalizePassword = (password) => String(password || "");

export function getPasswordChecks(password) {
  const value = normalizePassword(password);
  return Object.fromEntries(
    RULES.map(([name, test]) => [name, test(value)])
  );
}

export function isStrongPassword(password) {
  const value = normalizePassword(password);
  return RULES.every(([, test]) => test(value));
}

export function getPasswordValidationError(password) {
  const value = normalizePassword(password);
  const failedRule = RULES.find(([, test]) => !test(value));
  return failedRule ? failedRule[2] : "";
}
