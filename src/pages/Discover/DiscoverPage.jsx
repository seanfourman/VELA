import { useState, useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Divider from "@mui/material/Divider";
import PageShell from "@/components/layout/PageShell";
import velaTheme from "@/utils/muiTheme";
import "./styles/DiscoverPage.css";

const CONSTELLATIONS = [
  {
    id: "orion",
    name: "Orion",
    title: "The Hunter",
    season: "Winter",
    difficulty: "Beginner",
    keyStars: ["Betelgeuse", "Rigel", "Bellatrix"],
    description:
      "One of the most recognizable constellations. The three stars of Orion's Belt make it unmistakable in winter skies.",
    gradient: "linear-gradient(135deg, #0c1445 0%, #1a237e 60%, #283593 100%)",
    accent: "#7986cb",
  },
  {
    id: "ursa-major",
    name: "Ursa Major",
    title: "The Great Bear",
    season: "Year-round",
    difficulty: "Beginner",
    keyStars: ["Dubhe", "Merak", "Alioth"],
    description:
      "Home of the Big Dipper asterism, a reliable pointer to Polaris and the easiest way to find north.",
    gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b3a5c 60%, #264c73 100%)",
    accent: "#64b5f6",
  },
  {
    id: "scorpius",
    name: "Scorpius",
    title: "The Scorpion",
    season: "Summer",
    difficulty: "Beginner",
    keyStars: ["Antares", "Shaula", "Sargas"],
    description:
      "A striking S-shape low in the southern sky. Its red supergiant heart, Antares, rivals Mars in colour.",
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #4a1c1c 50%, #6b2020 100%)",
    accent: "#ef9a9a",
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    title: "The Queen",
    season: "Year-round",
    difficulty: "Beginner",
    keyStars: ["Schedar", "Caph", "Navi"],
    description:
      "The unmistakable W-shape circling the north celestial pole. Visible every clear night from mid-northern latitudes.",
    gradient: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #4a2c82 100%)",
    accent: "#ce93d8",
  },
  {
    id: "leo",
    name: "Leo",
    title: "The Lion",
    season: "Spring",
    difficulty: "Intermediate",
    keyStars: ["Regulus", "Denebola", "Algieba"],
    description:
      "A regal spring constellation whose sickle asterism outlines the lion's head and mane.",
    gradient: "linear-gradient(135deg, #1a1505 0%, #3d2e0a 50%, #5c4a14 100%)",
    accent: "#ffcc80",
  },
  {
    id: "cygnus",
    name: "Cygnus",
    title: "The Swan",
    season: "Summer",
    difficulty: "Beginner",
    keyStars: ["Deneb", "Albireo", "Sadr"],
    description:
      "The Northern Cross soars overhead in summer. Deneb anchors the Summer Triangle with Vega and Altair.",
    gradient: "linear-gradient(135deg, #0a1a1a 0%, #1a3c3c 50%, #265858 100%)",
    accent: "#80cbc4",
  },
  {
    id: "lyra",
    name: "Lyra",
    title: "The Harp",
    season: "Summer",
    difficulty: "Intermediate",
    keyStars: ["Vega", "Sheliak", "Sulafat"],
    description:
      "Small but brilliant, anchored by Vega — the fifth-brightest star in the sky and a Summer Triangle cornerstone.",
    gradient: "linear-gradient(135deg, #150a2e 0%, #2e1a5e 50%, #4a2c8a 100%)",
    accent: "#b39ddb",
  },
  {
    id: "andromeda",
    name: "Andromeda",
    title: "The Chained Princess",
    season: "Fall",
    difficulty: "Intermediate",
    keyStars: ["Alpheratz", "Mirach", "Almach"],
    description:
      "Best known for hosting M31, the Andromeda Galaxy — the most distant object visible with the naked eye.",
    gradient: "linear-gradient(135deg, #0a0e2e 0%, #182452 50%, #2a3c7e 100%)",
    accent: "#90caf9",
  },
];

const CELESTIAL_EVENTS = [
  {
    id: "lyrids-2026",
    name: "Lyrids Meteor Shower",
    date: "April 21–22",
    type: "Meteor Shower",
    icon: "☄️",
    description:
      "Up to 18 meteors per hour radiating from the constellation Lyra near the bright star Vega.",
    accent: "#ff9800",
  },
  {
    id: "lunar-eclipse-2026",
    name: "Total Lunar Eclipse",
    date: "August 28",
    type: "Eclipse",
    icon: "🌑",
    description:
      "The Moon passes through Earth's shadow, turning a deep copper-red for over an hour.",
    accent: "#f44336",
  },
  {
    id: "saturn-opposition-2026",
    name: "Saturn at Opposition",
    date: "September 21",
    type: "Opposition",
    icon: "🪐",
    description:
      "Saturn is at its closest and brightest — ideal for telescope viewing of the rings.",
    accent: "#ffd54f",
  },
  {
    id: "perseids-2026",
    name: "Perseids Meteor Shower",
    date: "August 11–13",
    type: "Meteor Shower",
    icon: "✨",
    description:
      "The year's most popular shower with 100+ meteors per hour under dark skies.",
    accent: "#4fc3f7",
  },
  {
    id: "jupiter-opposition-2026",
    name: "Jupiter at Opposition",
    date: "October 10",
    type: "Opposition",
    icon: "🔭",
    description:
      "Jupiter shines at magnitude −2.9 and is visible all night. Great time to spot the Galilean moons.",
    accent: "#ffb74d",
  },
  {
    id: "geminids-2026",
    name: "Geminids Meteor Shower",
    date: "December 13–14",
    type: "Meteor Shower",
    icon: "🌠",
    description:
      "The king of meteor showers — 120+ multicoloured meteors per hour in peak conditions.",
    accent: "#81c784",
  },
];

const DESTINATIONS = [
  {
    id: "cherry-springs",
    name: "Cherry Springs",
    location: "Pennsylvania, USA",
    bortle: 2,
    tagline: "Gold Tier IDA Dark Sky Park",
    gradient:
      "linear-gradient(to bottom, #0d2818 0%, #1b4332 50%, #2d6a4f 100%)",
  },
  {
    id: "namibrand",
    name: "NamibRand Reserve",
    location: "Namibia",
    bortle: 1,
    tagline: "Africa's first IDA Dark Sky Reserve",
    gradient:
      "linear-gradient(to bottom, #2e1a0a 0%, #5c3a1a 50%, #8b5e34 100%)",
  },
  {
    id: "aoraki",
    name: "Aoraki Mackenzie",
    location: "New Zealand",
    bortle: 1,
    tagline: "World's largest Dark Sky Reserve",
    gradient:
      "linear-gradient(to bottom, #0a1628 0%, #1a3050 50%, #2a4a78 100%)",
  },
  {
    id: "atacama",
    name: "Atacama Desert",
    location: "Chile",
    bortle: 1,
    tagline: "Home of the world's major observatories",
    gradient:
      "linear-gradient(to bottom, #1e1008 0%, #3e2a14 50%, #6b4a28 100%)",
  },
  {
    id: "jasper",
    name: "Jasper National Park",
    location: "Alberta, Canada",
    bortle: 2,
    tagline: "Largest Dark Sky Preserve on Earth",
    gradient:
      "linear-gradient(to bottom, #0a1e14 0%, #1a3e2e 50%, #2d6a4f 100%)",
  },
  {
    id: "la-palma",
    name: "La Palma",
    location: "Canary Islands, Spain",
    bortle: 2,
    tagline: "Roque de los Muchachos Observatory",
    gradient:
      "linear-gradient(to bottom, #0a1432 0%, #1a2e5c 50%, #2a4878 100%)",
  },
];

const SEASON_TABS = [
  { label: "All", value: "all" },
  { label: "Winter", value: "winter" },
  { label: "Spring", value: "spring" },
  { label: "Summer", value: "summer" },
  { label: "Fall", value: "fall" },
  { label: "Year-round", value: "year-round" },
];

function ConstellationCard({ constellation }) {
  return (
    <Card
      sx={{
        background: constellation.gradient,
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <Box
        sx={{
          height: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            opacity: 0.1,
            fontWeight: 800,
            fontSize: "3.2rem",
            color: "#fff",
            userSelect: "none",
            letterSpacing: "-0.03em",
          }}
        >
          {constellation.name}
        </Typography>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.35) 0%, transparent 100%), radial-gradient(1px 1px at 10% 60%, rgba(255,255,255,0.25) 0%, transparent 100%)",
          }}
        />
      </Box>
      <CardContent sx={{ pt: 1.5 }}>
        <Box sx={{ display: "flex", gap: 0.75, mb: 1.5 }}>
          <Chip
            label={constellation.season}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.15)" }}
          />
          <Chip
            label={constellation.difficulty}
            size="small"
            variant="outlined"
            sx={{
              borderColor: constellation.accent,
              color: constellation.accent,
            }}
          />
        </Box>
        <Typography variant="h6" sx={{ fontSize: "1.05rem", mb: 0.25 }}>
          {constellation.name}
        </Typography>
        <Typography
          sx={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "0.8rem",
            fontStyle: "italic",
            mb: 1.25,
          }}
        >
          {constellation.title}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.82rem", lineHeight: 1.55 }}>
          {constellation.description}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 2, flexWrap: "wrap" }}>
          {constellation.keyStars.map((star) => (
            <Chip
              key={star}
              label={`★ ${star}`}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.7rem",
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function EventTimelineItem({ event, isLast }) {
  return (
    <Box className="discover-timeline-item">
      <Box className="discover-timeline-dot" sx={{ "--dot-color": event.accent }} />
      {!isLast && <Box className="discover-timeline-line" />}
      <Card
        sx={{
          flex: 1,
          ml: 3,
          background: "rgba(255,255,255,0.05)",
          "&:hover": { background: "rgba(255,255,255,0.08)" },
        }}
      >
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Box
            sx={{
              fontSize: "1.8rem",
              lineHeight: 1,
              minWidth: 40,
              textAlign: "center",
              pt: 0.25,
            }}
          >
            {event.icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5, flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}>
                {event.name}
              </Typography>
              <Chip
                label={event.type}
                size="small"
                sx={{
                  bgcolor: `${event.accent}22`,
                  color: event.accent,
                  fontWeight: 600,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
            <Typography sx={{ color: event.accent, fontSize: "0.8rem", fontWeight: 500, mb: 0.75 }}>
              {event.date}, 2026
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {event.description}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function DestinationCard({ destination }) {
  const bortleColor = destination.bortle <= 1 ? "#22c55e" : "#4fc3f7";
  return (
    <Card
      className="discover-destination-card"
      sx={{
        minWidth: 280,
        maxWidth: 320,
        flex: "0 0 280px",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <Box sx={{ height: 140, background: destination.gradient, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1.5px 1.5px at 15% 25%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 85% 55%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 35% 75%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(2px 2px at 70% 80%, rgba(255,255,255,0.45) 0%, transparent 100%)",
          }}
        />
        <Chip
          label={`Bortle ${destination.bortle}`}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            bgcolor: `${bortleColor}22`,
            color: bortleColor,
            fontWeight: 700,
            border: `1px solid ${bortleColor}44`,
          }}
        />
      </Box>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: "1rem", mb: 0.25 }}>
          {destination.name}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", mb: 1 }}>
          {destination.location}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", fontStyle: "italic" }}>
          {destination.tagline}
        </Typography>
      </CardContent>
    </Card>
  );
}

function DiscoverPage({ isLight, onNavigate }) {
  const [seasonFilter, setSeasonFilter] = useState(0);

  const filteredConstellations = useMemo(() => {
    const value = SEASON_TABS[seasonFilter]?.value || "all";
    if (value === "all") return CONSTELLATIONS;
    return CONSTELLATIONS.filter(
      (c) => c.season.toLowerCase() === value,
    );
  }, [seasonFilter]);

  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title="Discover"
        subtitle="Explore constellations, upcoming celestial events, and the world's darkest skies."
        isLight={isLight}
        onNavigate={onNavigate}
        className="discover-page"
      >
        {/* Constellation filter */}
        <section className="profile-card glass-panel glass-panel-elevated discover-section">
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Constellations
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2 }}>
            Tap a season to filter what is best visible overhead.
          </Typography>
          <Tabs
            value={seasonFilter}
            onChange={(_, v) => setSeasonFilter(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2.5 }}
          >
            {SEASON_TABS.map((tab) => (
              <Tab key={tab.value} label={tab.label} />
            ))}
          </Tabs>
          <Box className="discover-grid">
            {filteredConstellations.map((c) => (
              <ConstellationCard key={c.id} constellation={c} />
            ))}
          </Box>
        </section>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Celestial events */}
        <section className="profile-card glass-panel glass-panel-elevated discover-section">
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Celestial Events 2026
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2.5 }}>
            Mark your calendar — the highlights of this year's sky.
          </Typography>
          <Box className="discover-timeline">
            {CELESTIAL_EVENTS.map((event, i) => (
              <EventTimelineItem
                key={event.id}
                event={event}
                isLast={i === CELESTIAL_EVENTS.length - 1}
              />
            ))}
          </Box>
        </section>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Featured destinations */}
        <section className="profile-card glass-panel glass-panel-elevated discover-section">
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Featured Dark-Sky Destinations
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2.5 }}>
            The best places on Earth for an unforgettable night under the stars.
          </Typography>
          <Box className="discover-destinations-scroll">
            {DESTINATIONS.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
          </Box>
        </section>
      </PageShell>
    </ThemeProvider>
  );
}

export default DiscoverPage;
