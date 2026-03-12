import { useMemo, useState, useEffect } from "react";
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
import Slider from "@mui/material/Slider";
import PageShell from "@/components/layout/PageShell";
import MoonGlobe from "@/components/planets/MoonGlobe";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import velaTheme from "@/utils/muiTheme";
import "./styles/NightPlannerPage.css";

/* ---- Moon-phase calculation ---- */
function computeMoonPhase(fractionOverride) {
  const synodicMonth = 29.53058770576;
  let fraction;
  let position;

  if (fractionOverride !== undefined) {
    fraction = fractionOverride;
    position = fraction * synodicMonth;
  } else {
    const now = new Date();
    const knownNewMoon = new Date("2000-01-06T18:14:00Z");
    const daysSince = (now - knownNewMoon) / 86400000;
    position = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
    fraction = position / synodicMonth;
  }

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

  return {
    fraction,
    illumination,
    name,
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
    description: "The Sun dips below the horizon.",
    color: "#ff8a65",
  },
  {
    label: "Civil Twilight",
    description: "Sky is bright. Planets like Venus become visible.",
    color: "#ffab40",
  },
  {
    label: "Nautical Twilight",
    description: "Horizon fades. Brighter stars and constellations appear.",
    color: "#7e57c2",
  },
  {
    label: "Astro Twilight",
    description: "Sky is nearly dark. Faint objects start to show.",
    color: "#5c6bc0",
  },
  {
    label: "Full Night",
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

function TwilightTimeline() {
  return (
    <Box className="night-twilight">
      <Typography variant="h6" sx={{ fontSize: "1.05rem", mb: 2 }}>
        Twilight Phases
      </Typography>
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
          <Box sx={{ flex: 1, pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 0.25 }}>
              {stage.label}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", lineHeight: 1.45 }}>
              {stage.description}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function StatBox({ label, value, subtext, highlightColor }) {
  return (
    <Card sx={{ background: "rgba(255,255,255,0.03)", height: "100%" }}>
      <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: "2rem", fontWeight: 700, color: highlightColor || "#fff", lineHeight: 1.1, mb: 0.5 }}>
          {value}
        </Typography>
        {subtext && (
          <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", mt: "auto", pt: 1 }}>
            {subtext}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
const MOON_MARKS = Array.from({ length: 65 }).map((_, i) => {
  const val = i / 64;
  // Major phase ticks (every 8th mark)
  if (i === 0 || i === 64) return { value: val, label: "New" };
  if (i === 8) return { value: val, label: "Waxing" };
  if (i === 16) return { value: val, label: "1st Qtr" };
  if (i === 24) return { value: val, label: "Gibbous" };
  if (i === 32) return { value: val, label: "Full" };
  if (i === 40) return { value: val, label: "Gibbous" };
  if (i === 48) return { value: val, label: "3rd Qtr" };
  if (i === 56) return { value: val, label: "Waning" };
  
  // Minor ticks
  return { value: val };
});

function NightPlannerPage({ isLight, onNavigate }) {
  const showGlobe = useMemo(() => isProbablyHardwareAccelerated(), []);
  
  // Actual real-world moon phase
  const actualMoon = useMemo(() => computeMoonPhase(), []);
  
  // Interactive slider state
  const [sliderFraction, setSliderFraction] = useState(actualMoon.fraction);
  
  // Re-calculate derived data based on the interactive slider
  const moon = useMemo(() => computeMoonPhase(sliderFraction), [sliderFraction]);
  
  // Proximity scaling effect for slider ticks
  useEffect(() => {
    const thumbIndex = Math.round(sliderFraction * 64);
    
    // Scale marks
    const marks = document.querySelectorAll(".moon-phase-slider .MuiSlider-mark");
    marks.forEach((mark) => {
      const idx = parseInt(mark.getAttribute("data-index"), 10);
      if (isNaN(idx)) return;
      const distance = Math.abs(idx - thumbIndex);
      let scaleY = 1;
      let scaleX = 1;
      if (distance === 0) { scaleY = 1.8; scaleX = 1.25; }
      else if (distance === 1) { scaleY = 1.4; scaleX = 1.15; }
      else if (distance === 2) { scaleY = 1.2; scaleX = 1.05; }
      else if (distance === 3) { scaleY = 1.05; scaleX = 1.02; }
      
      mark.style.transform = `scale(${scaleX}, ${scaleY})`;
      mark.style.transition = "transform 0.1s ease-out";
    });

    // Scale labels
    const labels = document.querySelectorAll(".moon-phase-slider .MuiSlider-markLabel");
    labels.forEach((label) => {
      const idx = parseInt(label.getAttribute("data-index"), 10);
      if (isNaN(idx)) return;
      const distance = Math.abs(idx - thumbIndex);
      let scale = 1;
      let color = "rgba(255, 255, 255, 0.5)";
      let textShadow = "none";
      
      if (distance <= 2) {
        scale = 1.25;
        color = "rgba(255, 255, 255, 1)";
        textShadow = "0 0 10px rgba(255,255,255,0.8)";
      } else if (distance <= 4) {
        scale = 1.1;
        color = "rgba(255, 255, 255, 0.8)";
        textShadow = "0 0 5px rgba(255,255,255,0.3)";
      }
      
      // Keep translateX(-50%) so MUI labels remain perfectly centered
      label.style.transform = `translateX(-50%) scale(${scale})`;
      label.style.transition = "transform 0.1s ease-out, color 0.1s ease-out, text-shadow 0.1s ease-out";
      label.style.color = color;
      label.style.textShadow = textShadow;
    });
  }, [sliderFraction]);
  
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

  const scoreColor = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Fair" : "Poor conditions";
  
  const bestWindow = moon.illumination > 60 ? "After moonset" : "All night";
  const recommendedTarget = moon.illumination > 60 ? "Planets & Bright Stars" : "Deep-Sky Objects";

  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title="" // We handle the title manually via the huge hero text
        subtitle=""
        isLight={isLight}
        onNavigate={onNavigate}
        hero={hero}
        className="night-planner-page"
      >
        {/* Massive Hero Title */}
        <Box sx={{ textAlign: "center", pt: 4, pb: 6, width: "100%" }}>
          <Typography 
            component="h1" 
            sx={{ 
              fontSize: "clamp(3rem, 8vw, 6rem)", 
              fontWeight: 800, 
              letterSpacing: "-0.03em",
              lineHeight: 1,
              background: "linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.6) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {moon.name}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", mt: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Day {moon.dayInCycle} of lunar cycle
          </Typography>

          {/* Interactive Moon Slider (Ruler style) */}
          <Box 
            sx={{ 
              mt: 6, 
              mb: 4, 
              position: "relative",
              // Break out of container to span full screen width
              width: "100vw", 
              left: "50%",
              transform: "translateX(-50%)",
              px: { xs: 4, md: 8 } 
            }}
          >
            <Slider
              value={sliderFraction}
              min={0}
              max={1}
              step={0.001}
              onChange={(e, val) => setSliderFraction(val)}
              aria-label="Moon Phase Interactive Slider"
              marks={MOON_MARKS}
              className="moon-phase-slider"
            />
            {Math.abs(sliderFraction - actualMoon.fraction) > 0.05 && (
              <Typography 
                onClick={() => setSliderFraction(actualMoon.fraction)}
                sx={{ 
                  position: "absolute", 
                  top: -24, 
                  right: { xs: 32, md: 64 }, 
                  fontSize: "0.75rem", 
                  color: "#aaddff", 
                  cursor: "pointer", 
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  "&:hover": { textDecoration: "underline" } 
                }}
              >
                Reset to Current
              </Typography>
            )}
          </Box>
        </Box>

        {/* Professional Data Grid */}
        <Box className="night-dashboard-grid">
          <Box className="night-grid-item night-grid-item--tall">
            <StatBox 
              label="Stargazing Score" 
              value={`${score}/100`} 
              subtext={`Conditions are rated as ${scoreLabel.toLowerCase()} based on lunar illumination and time of night.`}
              highlightColor={scoreColor}
            />
          </Box>
          <Box className="night-grid-item">
            <StatBox 
              label="Illumination" 
              value={`${moon.illumination}%`} 
              subtext={moon.illumination > 60 ? "High lunar glare expected." : "Dark sky conditions."}
            />
          </Box>
          <Box className="night-grid-item">
            <StatBox 
              label="Optimum Window" 
              value={bestWindow} 
            />
          </Box>
          <Box className="night-grid-item night-grid-item--wide">
            <StatBox 
              label="Recommended Targets" 
              value={recommendedTarget} 
              subtext={moon.illumination > 60 
                ? "The moon's brightness washes out faint nebulae. Stick to point sources." 
                : "Perfect conditions for hunting galaxies, star clusters, and the Milky Way."}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Lower Details: Twilight & Tips */}
        <Box className="night-details-grid">
          <Card sx={{ background: "rgba(255,255,255,0.02)", flex: 1 }}>
            <CardContent sx={{ p: 4 }}>
              <TwilightTimeline />
            </CardContent>
          </Card>

          <Card sx={{ background: "rgba(255,255,255,0.02)", flex: 1.5 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontSize: "1.05rem", mb: 2 }}>
                Observer's Log
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {TIPS.map((tip) => (
                  <Accordion key={tip.title} disableGutters>
                    <AccordionSummary expandIcon={<ExpandChevron />}>
                      <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }}>
                        {tip.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                        {tip.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </PageShell>
    </ThemeProvider>
  );
}

export default NightPlannerPage;
