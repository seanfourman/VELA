export const formatDateTime = (
  value,
  { includeYear = false, fallback = "TBD" } = {},
) => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const formatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (includeYear) {
    formatOptions.year = "numeric";
  }

  return parsed.toLocaleString([], formatOptions);
};
