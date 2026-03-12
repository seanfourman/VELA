import { createTheme } from "@mui/material/styles";

const velaTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ffffff", contrastText: "#121218" },
    secondary: { main: "#6ca7ff" },
    background: { default: "#121218", paper: "rgba(255,255,255,0.08)" },
    text: {
      primary: "rgba(255,255,255,0.95)",
      secondary: "rgba(255,255,255,0.65)",
      disabled: "rgba(255,255,255,0.45)",
    },
    divider: "rgba(255,255,255,0.12)",
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error: { main: "#dc2626" },
  },
  typography: {
    fontFamily:
      '"Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
          transition:
            "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.32)",
            borderColor: "rgba(255,255,255,0.28)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, fontSize: "0.75rem" },
        filled: {
          backgroundColor: "rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.95)",
        },
        outlined: { borderColor: "rgba(255,255,255,0.18)" },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { backgroundColor: "#fff", borderRadius: 2, height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          color: "rgba(255,255,255,0.55)",
          "&.Mui-selected": { color: "#fff" },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px !important",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: 0 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.85)",
        },
        head: {
          fontWeight: 600,
          color: "rgba(255,255,255,0.95)",
          backgroundColor: "rgba(255,255,255,0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 10, fontWeight: 500 },
        outlined: {
          borderColor: "rgba(255,255,255,0.18)",
          color: "rgba(255,255,255,0.85)",
          "&:hover": {
            borderColor: "rgba(255,255,255,0.32)",
            backgroundColor: "rgba(255,255,255,0.06)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(255,255,255,0.08)",
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "rgba(255,255,255,0.1)" } },
    },
  },
});

export default velaTheme;
