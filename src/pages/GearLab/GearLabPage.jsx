import { useCallback, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import PageShell from "@/components/layout/PageShell";
import velaTheme from "@/utils/muiTheme";
import "./styles/GearLabPage.css";

const CATEGORIES = ["Telescopes", "Binoculars", "Mounts", "Accessories"];

const EQUIPMENT = [
  {
    id: "heritage-130p",
    name: "Sky-Watcher Heritage 130P",
    category: "Telescopes",
    type: "Tabletop Dobsonian",
    aperture: "130 mm",
    focalLength: "650 mm",
    weight: "5.6 kg",
    skill: 20,
    price: "Under $250",
    highlight: "Best first serious telescope",
    description:
      "Compact tabletop reflector perfect for beginners. Great optics for the price with easy setup.",
  },
  {
    id: "nexstar-6se",
    name: "Celestron NexStar 6SE",
    category: "Telescopes",
    type: "Schmidt-Cassegrain",
    aperture: "150 mm",
    focalLength: "1500 mm",
    weight: "13.6 kg",
    skill: 50,
    price: "$500–$800",
    highlight: "GoTo computerised tracking",
    description:
      "Computerised GoTo scope that finds objects automatically. Ideal for planets and bright deep-sky.",
  },
  {
    id: "xt8",
    name: "Orion SkyQuest XT8",
    category: "Telescopes",
    type: "Dobsonian",
    aperture: "203 mm",
    focalLength: "1200 mm",
    weight: "18.6 kg",
    skill: 40,
    price: "$400–$600",
    highlight: "Best aperture per dollar",
    description:
      "Classic 8-inch Dobsonian — huge light gathering for the money. The most recommended scope for deep-sky.",
  },
  {
    id: "edgehd-8",
    name: "Celestron EdgeHD 8\"",
    category: "Telescopes",
    type: "Schmidt-Cassegrain",
    aperture: "203 mm",
    focalLength: "2032 mm",
    weight: "14.5 kg",
    skill: 80,
    price: "$1500+",
    highlight: "Flat-field astrograph quality",
    description:
      "Premium SCT with edge-corrected optics. Excellent for astrophotography and detailed planetary observation.",
  },
  {
    id: "skymaster-15x70",
    name: "Celestron SkyMaster 15×70",
    category: "Binoculars",
    type: "Porro Prism",
    aperture: "70 mm",
    focalLength: "—",
    weight: "1.3 kg",
    skill: 10,
    price: "Under $100",
    highlight: "Affordable stargazing binoculars",
    description:
      "High-power binoculars ideal for star clusters, the Moon, and wide-field sweeps of the Milky Way.",
  },
  {
    id: "aculon-10x50",
    name: "Nikon Aculon A211 10×50",
    category: "Binoculars",
    type: "Porro Prism",
    aperture: "50 mm",
    focalLength: "—",
    weight: "0.9 kg",
    skill: 10,
    price: "Under $120",
    highlight: "All-round quality",
    description:
      "Excellent general-purpose binoculars comfortable for extended sessions. Bright, sharp views.",
  },
  {
    id: "star-adventurer",
    name: "Sky-Watcher Star Adventurer 2i",
    category: "Mounts",
    type: "Star Tracker",
    aperture: "—",
    focalLength: "—",
    weight: "1.1 kg",
    skill: 55,
    price: "$400–$500",
    highlight: "Portable astrophotography",
    description:
      "Compact star tracker for DSLR astrophotography. Cancels Earth's rotation for long-exposure shots.",
  },
  {
    id: "avx-mount",
    name: "Celestron Advanced VX",
    category: "Mounts",
    type: "German Equatorial",
    aperture: "—",
    focalLength: "—",
    weight: "13.2 kg",
    skill: 70,
    price: "$800–$1000",
    highlight: "Full GoTo equatorial",
    description:
      "Serious equatorial mount with GoTo tracking. Supports telescopes up to 14 kg for imaging and visual.",
  },
  {
    id: "moon-filter",
    name: "Moon Filter Set",
    category: "Accessories",
    type: "Eyepiece Filter",
    aperture: "—",
    focalLength: "—",
    weight: "0.05 kg",
    skill: 5,
    price: "Under $20",
    highlight: "Reduces lunar glare",
    description:
      "Essential for comfortable Moon viewing. Cuts brightness and reveals more surface detail.",
  },
  {
    id: "laser-pointer",
    name: "Green Laser Pointer",
    category: "Accessories",
    type: "Alignment Tool",
    aperture: "—",
    focalLength: "—",
    weight: "0.12 kg",
    skill: 5,
    price: "$15–$30",
    highlight: "Point out objects in the sky",
    description:
      "A 5 mW green laser creates a visible beam pointing toward stars. Great for teaching and star parties.",
  },
];

const WIZARD_STEPS = ["Observe", "Budget", "Experience"];

const WIZARD_OPTIONS = {
  observe: [
    { label: "Planets & Moon", value: "planets" },
    { label: "Deep-sky (nebulae, galaxies)", value: "deepsky" },
    { label: "Both", value: "both" },
    { label: "Astrophotography", value: "photo" },
  ],
  budget: [
    { label: "Under $200", value: "low" },
    { label: "$200 – $500", value: "mid" },
    { label: "$500 – $1000", value: "high" },
    { label: "Over $1000", value: "premium" },
  ],
  experience: [
    { label: "Complete beginner", value: "beginner" },
    { label: "Some experience", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ],
};

function getRecommendations(answers) {
  const { observe, budget, experience } = answers;
  const recs = [];

  if (budget === "low") {
    recs.push("skymaster-15x70", "aculon-10x50", "moon-filter");
    if (observe !== "photo") recs.push("laser-pointer");
  } else if (budget === "mid") {
    recs.push("heritage-130p", "xt8", "moon-filter");
    if (observe === "photo") recs.push("star-adventurer");
  } else if (budget === "high") {
    recs.push("nexstar-6se", "xt8", "star-adventurer");
    if (experience !== "beginner") recs.push("avx-mount");
  } else {
    recs.push("edgehd-8", "avx-mount", "nexstar-6se");
    if (observe === "photo" || observe === "both") recs.push("star-adventurer");
  }

  return [...new Set(recs)]
    .map((id) => EQUIPMENT.find((e) => e.id === id))
    .filter(Boolean);
}

function SkillBar({ value }) {
  const color = value <= 30 ? "#22c55e" : value <= 60 ? "#f59e0b" : "#ef4444";
  const label = value <= 30 ? "Beginner" : value <= 60 ? "Intermediate" : "Advanced";
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
          Skill Level
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color, fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.08)",
          "& .MuiLinearProgress-bar": { borderRadius: 2, bgcolor: color },
        }}
      />
    </Box>
  );
}

function EquipmentCard({ item, checked, onToggle }) {
  return (
    <Card sx={{ position: "relative", background: "rgba(255,255,255,0.05)" }}>
      <Checkbox
        checked={checked}
        onChange={() => onToggle(item.id)}
        size="small"
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          color: "rgba(255,255,255,0.3)",
          "&.Mui-checked": { color: "#22c55e" },
        }}
      />
      <CardContent sx={{ pr: 5 }}>
        <Typography variant="h6" sx={{ fontSize: "0.95rem", mb: 0.25 }}>
          {item.name}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.75, mb: 1.25, flexWrap: "wrap" }}>
          <Chip label={item.type} size="small" sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
          <Chip label={item.price} size="small" variant="outlined" sx={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }} />
        </Box>
        <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", lineHeight: 1.5, mb: 1.5 }}>
          {item.description}
        </Typography>

        {item.aperture !== "—" && (
          <Box className="gear-spec-row">
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
              Aperture
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
              {item.aperture}
            </Typography>
          </Box>
        )}
        {item.focalLength !== "—" && (
          <Box className="gear-spec-row">
            <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
              Focal Length
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
              {item.focalLength}
            </Typography>
          </Box>
        )}
        <Box className="gear-spec-row" sx={{ mb: 1.25 }}>
          <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
            Weight
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
            {item.weight}
          </Typography>
        </Box>
        <SkillBar value={item.skill} />
        <Chip
          label={item.highlight}
          size="small"
          sx={{
            mt: 1.5,
            bgcolor: "rgba(108,167,255,0.12)",
            color: "#90caf9",
            fontWeight: 600,
            fontSize: "0.72rem",
          }}
        />
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ items }) {
  if (items.length < 2) return null;
  const specKeys = [
    { key: "type", label: "Type" },
    { key: "aperture", label: "Aperture" },
    { key: "focalLength", label: "Focal Length" },
    { key: "weight", label: "Weight" },
    { key: "price", label: "Price" },
    { key: "highlight", label: "Highlight" },
  ];

  return (
    <section className="profile-card glass-panel glass-panel-elevated gear-section">
      <Typography variant="h5" sx={{ mb: 2 }}>
        Compare ({items.length})
      </Typography>
      <TableContainer component={Paper} sx={{ bgcolor: "transparent", boxShadow: "none" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Spec</TableCell>
              {items.map((item) => (
                <TableCell key={item.id} align="center">
                  {item.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {specKeys.map((spec) => (
              <TableRow key={spec.key}>
                <TableCell sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>{spec.label}</TableCell>
                {items.map((item) => (
                  <TableCell key={item.id} align="center">
                    {item[spec.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}

function BeginnerWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const stepKeys = ["observe", "budget", "experience"];
  const currentKey = stepKeys[activeStep];
  const isComplete = activeStep >= WIZARD_STEPS.length;

  const handlePick = (value) => {
    const next = { ...answers, [currentKey]: value };
    setAnswers(next);
    setActiveStep((s) => s + 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setAnswers({});
  };

  const recommendations = isComplete ? getRecommendations(answers) : [];

  return (
    <section className="profile-card glass-panel glass-panel-elevated gear-section">
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Gear Finder
      </Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", mb: 2.5 }}>
        Answer three quick questions and get a personalized recommendation.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {WIZARD_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel
              sx={{
                "& .MuiStepLabel-label": { color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" },
                "& .MuiStepLabel-label.Mui-active": { color: "#fff" },
                "& .MuiStepLabel-label.Mui-completed": { color: "rgba(255,255,255,0.7)" },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {!isComplete ? (
        <Box className="gear-wizard-options">
          {WIZARD_OPTIONS[currentKey].map((opt) => (
            <Button
              key={opt.value}
              variant="outlined"
              onClick={() => handlePick(opt.value)}
              sx={{ justifyContent: "flex-start", py: 1.25, px: 2.5 }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>
      ) : (
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1.5 }}>
            We recommend:
          </Typography>
          <Box className="gear-grid">
            {recommendations.map((item) => (
              <Card key={item.id} sx={{ background: "rgba(255,255,255,0.05)" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontSize: "0.92rem", mb: 0.5 }}>
                    {item.name}
                  </Typography>
                  <Chip label={item.price} size="small" sx={{ mb: 1, bgcolor: "rgba(255,255,255,0.1)" }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Button variant="outlined" onClick={handleReset} sx={{ mt: 2 }}>
            Start over
          </Button>
        </Box>
      )}
    </section>
  );
}

function GearLabPage({ isLight, onNavigate }) {
  const [categoryTab, setCategoryTab] = useState(0);
  const [compareIds, setCompareIds] = useState([]);

  const currentCategory = CATEGORIES[categoryTab];
  const filteredEquipment = useMemo(
    () => EQUIPMENT.filter((e) => e.category === currentCategory),
    [currentCategory],
  );
  const compareItems = useMemo(
    () => compareIds.map((id) => EQUIPMENT.find((e) => e.id === id)).filter(Boolean),
    [compareIds],
  );

  const handleToggleCompare = useCallback((id) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id],
    );
  }, []);

  return (
    <ThemeProvider theme={velaTheme}>
      <PageShell
        title="Gear Lab"
        subtitle="Explore stargazing equipment, compare specs, and find your perfect setup."
        isLight={isLight}
        onNavigate={onNavigate}
        className="gear-lab-page"
      >
        {/* Category tabs + cards */}
        <section className="profile-card glass-panel glass-panel-elevated gear-section">
          <Typography variant="h5" sx={{ mb: 2 }}>
            Equipment
          </Typography>
          <Tabs
            value={categoryTab}
            onChange={(_, v) => setCategoryTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2.5 }}
          >
            {CATEGORIES.map((cat) => (
              <Tab key={cat} label={cat} />
            ))}
          </Tabs>
          {compareIds.length > 0 && (
            <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", mb: 1.5 }}>
              {compareIds.length}/3 selected for comparison
              {compareIds.length >= 3 ? " (max reached)" : " — check more to compare"}
            </Typography>
          )}
          <Box className="gear-grid">
            {filteredEquipment.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                checked={compareIds.includes(item.id)}
                onToggle={handleToggleCompare}
              />
            ))}
          </Box>
        </section>

        {compareItems.length >= 2 && (
          <>
            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />
            <ComparisonTable items={compareItems} />
          </>
        )}

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />

        <BeginnerWizard />
      </PageShell>
    </ThemeProvider>
  );
}

export default GearLabPage;
