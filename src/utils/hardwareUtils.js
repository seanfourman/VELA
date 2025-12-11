let cachedHwAcceleration = null;

export function isProbablyHardwareAccelerated() {
  if (cachedHwAcceleration !== null) return cachedHwAcceleration;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      cachedHwAcceleration = false;
      return cachedHwAcceleration;
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      cachedHwAcceleration = true;
      return cachedHwAcceleration;
    }

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
    const isSoftware = /swiftshader|software/i.test(renderer);
    cachedHwAcceleration = !isSoftware;
    return cachedHwAcceleration;
  } catch {
    cachedHwAcceleration = false;
    return cachedHwAcceleration;
  }
}

export default isProbablyHardwareAccelerated;
