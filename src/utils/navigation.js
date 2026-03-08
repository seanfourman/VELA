export const navigateToPath = ({ path, navigate }) => {
  const nextPath = typeof path === "string" && path.trim() ? path : "/";

  if (typeof navigate === "function") {
    navigate(nextPath);
    return;
  }

  if (typeof window !== "undefined") {
    window.location.assign(nextPath);
  }
};

export const navigateToMapHome = ({ navigate }) =>
  navigateToPath({ path: "/", navigate });
