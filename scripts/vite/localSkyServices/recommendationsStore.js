import fs from "node:fs";
import path from "node:path";

export function createRecommendationsStore(recommendationsPath) {
  const readRecommendations = () => {
    if (!fs.existsSync(recommendationsPath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(recommendationsPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.locations)) return parsed.locations;
      return [];
    } catch {
      return [];
    }
  };

  const writeRecommendations = (locations) => {
    let existing = null;
    if (fs.existsSync(recommendationsPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(recommendationsPath, "utf8"));
      } catch {
        existing = null;
      }
    }

    const payload = Array.isArray(existing)
      ? locations
      : {
          ...(existing && typeof existing === "object" ? existing : {}),
          generated_at_utc: new Date().toISOString(),
          locations,
        };

    fs.mkdirSync(path.dirname(recommendationsPath), { recursive: true });
    fs.writeFileSync(
      recommendationsPath,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  };

  return {
    readRecommendations,
    writeRecommendations,
  };
}
