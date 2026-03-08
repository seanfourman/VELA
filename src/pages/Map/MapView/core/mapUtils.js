const isCoarsePointerEnv = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
};

export { isCoarsePointerEnv };
