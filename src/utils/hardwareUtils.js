let cachedHwAcceleration = null;

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

export default isProbablyHardwareAccelerated;
