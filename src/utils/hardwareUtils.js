let cachedHwAcceleration = null;

export const HARDWARE_ACCELERATION_REQUIRED_ROUTES = new Set([
  "/constellations",
  "/moon-phase",
  "/solar-system",
]);

const detectHardwareAcceleration = () => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return false;

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return true;

  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
  return !/swiftshader|software/i.test(renderer);
};

export function isProbablyHardwareAccelerated() {
  if (cachedHwAcceleration !== null) return cachedHwAcceleration;

  try {
    cachedHwAcceleration = detectHardwareAcceleration();
  } catch {
    cachedHwAcceleration = false;
  }

  return cachedHwAcceleration;
}

export function requiresHardwareAccelerationRoute(pathname) {
  return HARDWARE_ACCELERATION_REQUIRED_ROUTES.has(pathname);
}
