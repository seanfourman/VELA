export const navigateToPath = ({ path, navigate }) => {
  if (typeof navigate !== "function") return;

  const nextPath = typeof path === "string" && path.trim() ? path : "/";
  navigate(nextPath);
};

export const navigateToMapHome = ({ navigate }) =>
  navigateToPath({ path: "/", navigate });
