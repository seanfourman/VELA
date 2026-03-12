import { useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import PageShell from "@/components/layout/PageShell";
import MoonGlobe from "@/components/planets/MoonGlobe";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import velaTheme from "@/utils/muiTheme";
import "@/styles/aurora.css";
import "./styles/NightPlannerPage.css";

/* ---- Moon-phase calculation ---- */
function computeMoonPhase() {
  const now = new Date();
  const knownNewMoon = new Date("2000-01-06T18:14:00Z");
  const synodicMonth = 29.53058770576;
  const daysSince = (now - knownNewMoon) / 86400000;
  const position =
    ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const fraction = position / synodicMonth;
  const illumination = Math.round(
    ((1 - Math.cos(fraction * 2 * Math.PI)) / 2) * 100,
  );

  let name;
  if (fraction < 0.0625) name = "New Moon";
  else if (fraction < 0.1875) name = "Waxing Crescent";
  else if (fraction < 0.3125) name = "First Quarter";
  else if (fraction < 0.4375) name = "Waxing Gibbous";
  else if (fraction < 0.5625) name = "Full Moon";
  else if (fraction < 0.6875) name = "Waning Gibbous";
  else if (fraction < 0.8125) name = "Last Quarter";
  else if (fraction < 0.9375) name = "Waning Crescent";
  else name = "New Moon";

  const emoji =
    fraction < 0.0625
      ? "🌑"
      : fraction < 0.1875
        ? "🌒"
        : fraction < 0.3125
          ? "🌓"
          : fraction < 0.4375
            ? "🌔"
            : fraction < 0.5625
              ? "🌕"
              : fraction < 0.6875
                ? "🌖"
                : fraction < 0.8125
                  ? "🌗"
                  : fraction < 0.9375
                    ? "🌘"
                    : "🌑";

  return {
    fraction,
    illumination,
    name,
    emoji,
    dayInCycle: Math.round(position),
  };
}

function computeStargazingScore(moonIllumination) {
  const moonFactor = 100 - moonIllumination;
  const now = new Date();
  const hour = now.getHours();
  const nightFactor =
    hour >= 22 || hour <= 4 ? 100 : hour >= 20 || hour <= 6 ? 70 : 30;
  return Math.round(moonFactor * 0.6 + nightFactor * 0.4);
}

const TWILIGHT_STAGES = [
  {
    label: "Sunset",
    icon: "🌅",
    description: "The Sun dips below the horizon.",
    color: "#ff8a65",
  },
  {
    label: "Civil Twilight",
    icon: "🌇",
    description: "Sky is bright. Planets like Venus become visible.",
    color: "#ffab40",
  },
  {
    label: "Nautical Twilight",
    icon: "🌆",
    description: "Horizon fades. Brighter stars and constellations appear.",
    color: "#7e57c2",
  },
  {
    label: "Astro Twilight",
    icon: "🌌",
    description: "Sky is nearly dark. Faint objects start to show.",
    color: "#5c6bc0",
  },
  {
    label: "Full Night",
    icon: "✨",
    description:
      "True darkness — ideal for deep-sky targets, meteor showers, and the Milky Way.",
    color: "#26c6da",
  },
];

const TIPS = [
  {
    title: "What to Look For Tonight",
    content:
      "Start with the brightest objects — the Moon and visible planets are easy targets. Then move to prominent constellations near the zenith where atmospheric distortion is lowest. If the Moon is bright, focus on double stars and planets rather than faint nebulae.",
  },
  {
    title: "Best Viewing Practices",
    content:
      "Give your eyes at least 20 minutes to dark-adapt. Use a red flashlight to preserve night vision. Dress warmer than you think — standing still in the dark gets cold fast. Sit or recline to reduce neck strain during overhead observing.",
  },
  {
    title: "Astrophotography Tips",
    content:
      "For phone shots of the Moon, use manual mode with low ISO (100-400) and fast shutter. For star trails, aim for 15-30 second exposures at ISO 1600+. A simple phone tripod mount makes a huge difference. Stack multiple exposures for cleaner results.",
  },
  {
    title: "Gear Suggestions for Tonight",
    content:
      "Binoculars (7×50 or 10×50) are the most underrated stargazing tool — great for star clusters, the Moon's craters, and Jupiter's moons. If using a telescope, start with your lowest-power eyepiece to find targets, then increase magnification.",
  },
];

const ExpandChevron = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ opacity: 0.6 }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function ScoreRing({ score }) {
  const color =
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 75
      ? "Excellent"
      : score >= 50
        ? "Good"
        : score >= 25
          ? "Fair"
          : "Poor";
  return (
    <Box className="night-score-ring">
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={180}
          thickness={3}
          sx={{ color: "rgba(255,255,255,0.08)", position: "absolute" }}
        />
        <CircularProgress
          variant="determinate"
          value={score}
          size={180}
          thickness={3}
          sx={{ color, filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
        <Box className="night-score-ring__inner">
          <Typography sx={{ fontSize: "2.8rem", fontWeight: 700, color, lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", mt: 0.5 }}>
            {label}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
        Stargazing Score
      </Typography>
    </Box>
  );
}

function MoonPhaseWidget({ moon }) {
  return (
    <Card sx={{ background: "rgba(255,255,255,0.05)" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography sx={{ fontSize: "3rem", lineHeight: 1 }}>{moon.emoji}</Typography>
          <Box>
            <Typography variant="h6" sx={{ fontSize: "1rem" }}>
              {moon.name}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>
              Day {moon.dayInCycle} of cycle
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" }}>
              Illumination
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {moon.illumination}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={moon.illumination}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
                bgcolor: moon.illumination > 60 ? "#f59e0b" : "#22c55e",
              },
            }}
          />
        </Box>
        <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", mt: 1 }}>
          {moon.illumination > 60
            ? "Bright Moon — stick to planets, double stars, and bright targets."
            : "Dark sky conditions — great for deep-sky objects and the Milky Way."}
        </Typography>
      </CardContent>
    </Card>
  );
}

function TwilightTimeline() {
  return (
    <Box className="night-twilight">
      {TWILIGHT_STAGES.map((stage, i) => (
        <Box key={stage.label} className="night-twilight-step">
          <Box className="night-twilight-step__indicator">
            <Box
              className="night-twilight-dot"
              sx={{
                bgcolor: stage.color,
                boxShadow: `0 0 8px ${stage.color}88`,
              }}
            />
            {i < TWILIGHT_STAGES.length - 1 && (
              <Box className="night-twilight-connector" />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <Typography sx={{ fontSize: "1.1rem" }}>{stage.icon}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>
                {stage.label}
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", lineHeight: 1.45 }}>
              {stage.description}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function NightPlannerPage({ isLight, onNavigate }) {
  const showGlobe = useMemo(() => isProbablyHardwareAccelerated(), []);
  const moon = useMemo(() => computeMoonPhase(), []);
  const score = useMemo(
    () => computeStargazingScore(moon.illumination),
    [moon.illumination],
  );

  const hero = showGlobe ? (
    <MoonGlobe
      phaseFraction={moon.fraction}
      className="profile-page__earth-canvas"
    />
  ) : null;

  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title="Night Planner"
        subtitle="Check tonight's conditions and plan your stargazing session."
        isLight={isLight}
        onNavigate={onNavigate}
        hero={hero}
        className="night-planner-page"
      >
        {/* Score + Moon row */}
        <section className="profile-card glass-panel glass-panel-elevated night-section">
          <Box className="night-top-row">
            <ScoreRing score={score} />
            <Box sx={{ flex: 1, minWidth: 260 }}>
              <MoonPhaseWidget moon={moon} />
            </Box>
          </Box>
        </section>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Conditions summary */}
        <section className="profile-card glass-panel glass-panel-elevated night-section">
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Tonight at a Glance
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2 }}>
            Quick stats for your stargazing session.
          </Typography>
          <Box className="night-stat-grid">
            {[
              {
                label: "Moon Phase",
                value: moon.name,
                icon: moon.emoji,
              },
              {
                label: "Illumination",
                value: `${moon.illumination}%`,
                icon: "💡",
              },
              {
                label: "Best Window",
                value:
                  moon.illumination > 60
                    ? "After moonset"
                    : "All night",
                icon: "🕐",
              },
              {
                label: "Recommended",
                value:
                  moon.illumination > 60
                    ? "Planets & Moon"
                    : "Deep-sky objects",
                icon: "🎯",
              },
            ].map((stat) => (
              <Card
                key={stat.label}
                sx={{ background: "rgba(255,255,255,0.04)", textAlign: "center" }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography sx={{ fontSize: "1.6rem", mb: 0.75 }}>
                    {stat.icon}
                  </Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", mb: 0.25 }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </section>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Twilight timeline */}
        <section className="profile-card glass-panel glass-panel-elevated night-section">
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Twilight Phases
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2.5 }}>
            How total darkness unfolds after sunset.
          </Typography>
          <TwilightTimeline />
        </section>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Tips */}
        <section className="profile-card glass-panel glass-panel-elevated night-section">
          <Typography variant="h5" sx={{ mb: 2 }}>
            Stargazing Tips
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {TIPS.map((tip) => (
              <Accordion key={tip.title} disableGutters>
                <AccordionSummary expandIcon={<ExpandChevron />}>
                  <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }}>
                    {tip.title}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.84rem", lineHeight: 1.6 }}>
                    {tip.content}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </section>
      </PageShell>
    </ThemeProvider>
  );
}

export default NightPlannerPage;
