import { useMemo, useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Slider from "@mui/material/Slider";
import PageShell from "@/components/layout/PageShell";
import MoonGlobe from "@/components/planets/MoonGlobe";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import velaTheme from "@/utils/muiTheme";
import {
  computeMoonPhase,
  isMoonPhaseSimulation,
  MOON_MARKS,
  useLiveMoonPhase,
  useMoonSliderEffects,
  useObservationPlan,
} from "./useNightPlanner";
import "./styles/NightPlannerPage.css";

function StatBox({ label, value, subtext, highlightColor }) {
  return (
    <Card
      sx={{
        background: "rgba(255,255,255,0.03)",
        height: "100%",
        transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        "&:hover": {
          transform: "none",
        },
      }}
    >
      <CardContent
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "flex-start",
        }}
      >
        <Typography
          sx={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            mb: 1,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: "2rem",
            fontWeight: 700,
            color: highlightColor || "#fff",
            lineHeight: 1.1,
            mb: 0.5,
          }}
        >
          {value}
        </Typography>
        {subtext ? (
          <Typography
            sx={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "0.8rem",
              mt: 1,
              pt: 0,
            }}
          >
            {subtext}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NightPlannerPage({ isLight, onNavigate, location, locationStatus }) {
  const showGlobe = useMemo(() => isProbablyHardwareAccelerated(), []);
  const sliderScopeRef = useRef(null);
  const actualMoon = useLiveMoonPhase();
  const [sliderFraction, setSliderFraction] = useState(actualMoon.fraction);

  const isSimulating = isMoonPhaseSimulation(
    sliderFraction,
    actualMoon.fraction,
  );
  const activeFraction = isSimulating ? sliderFraction : actualMoon.fraction;
  const moon = useMemo(() => computeMoonPhase(activeFraction), [activeFraction]);

  useMoonSliderEffects(sliderScopeRef, activeFraction);

  const observationPlan = useObservationPlan({
    actualMoon,
    moon,
    isSimulating,
    location,
    locationStatus,
  });
  const scoreColor =
    observationPlan.score >= 75
      ? "#22c55e"
      : observationPlan.score >= 50
        ? "#f59e0b"
        : "#ef4444";

  const hero = showGlobe ? (
    <MoonGlobe
      phaseFraction={moon.fraction}
      className="profile-page__earth-canvas"
    />
  ) : null;

  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title=""
        subtitle=""
        isLight={isLight}
        onNavigate={onNavigate}
        hero={hero}
        className="night-planner-page"
        hideHeader={true}
        hideBackButton={true}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            flex: "1 1 auto",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              textAlign: "center",
              flex: "1 1 auto",
              minHeight: 0,
              width: "100%",
              pt: { xs: 0, md: 26 },
              pb: 4,
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontSize: "clamp(3rem, 8vw, 6rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                pb: 1,
                background:
                  "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.6) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {moon.name}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "1.1rem",
                mt: 2,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Day {moon.dayInCycle} of lunar cycle
            </Typography>

            <Box
              ref={sliderScopeRef}
              sx={{
                mb: { xs: 6, md: 8 },
                position: "relative",
                width: { xs: "100%", md: "100vw" },
                left: { xs: "auto", md: "50%" },
                transform: { xs: "none", md: "translateX(-50%)" },
                px: { xs: 1, md: 8 },
              }}
            >
              <Slider
                value={activeFraction}
                min={0}
                max={1}
                step={0.001}
                onChange={(e, val) =>
                  setSliderFraction(Array.isArray(val) ? val[0] : val)
                }
                aria-label="Moon Phase Interactive Slider"
                marks={MOON_MARKS}
                className="moon-phase-slider"
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 4,
                  minHeight: 40,
                }}
              >
                <Typography
                  onClick={() => setSliderFraction(actualMoon.fraction)}
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.8)",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    border: "1px solid rgba(255, 255, 255, 0.24)",
                    borderRadius: "24px",
                    px: 3,
                    py: 1,
                    background: "rgba(255, 255, 255, 0.04)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                    transition: "all 0.2s ease",
                    visibility: isSimulating ? "visible" : "hidden",
                    opacity: isSimulating ? 1 : 0,
                    pointerEvents: isSimulating ? "auto" : "none",
                    "&:hover": {
                      color: "#fff",
                      borderColor: "rgba(255, 255, 255, 0.34)",
                      background: "rgba(255, 255, 255, 0.08)",
                    },
                  }}
                >
                  Reset to Current
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box className="night-dashboard-grid" sx={{ mt: "auto" }}>
            <Box className="night-grid-item">
              <StatBox
                label="Stargazing Score"
                value={`${observationPlan.score}/100`}
                subtext={`${observationPlan.scoreSubtext} Conditions rate as ${observationPlan.scoreLabel.toLowerCase()}.`}
                highlightColor={scoreColor}
              />
            </Box>
            <Box className="night-grid-item">
              <StatBox
                label="Illumination"
                value={`${moon.illumination}%`}
                subtext={
                  moon.illumination > 60
                    ? "High lunar glare expected."
                    : "Dark sky conditions."
                }
              />
            </Box>
            <Box className="night-grid-item">
              <StatBox
                label="Optimum Window"
                value={observationPlan.bestWindow}
                subtext={observationPlan.bestWindowSubtext}
              />
            </Box>
            <Box className="night-grid-item">
              <StatBox
                label="Recommended Targets"
                value={observationPlan.recommendedTarget}
                subtext={observationPlan.recommendedTargetSubtext}
              />
            </Box>
          </Box>
        </Box>
      </PageShell>
    </ThemeProvider>
  );
}

export default NightPlannerPage;
