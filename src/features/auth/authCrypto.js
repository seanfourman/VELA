const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const createPasswordSalt = () => {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
};

const fallbackHash = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `f-${Math.abs(hash).toString(16)}-${value.length}`;
};

export const hashPassword = async (password, salt) => {
  const payload = `${String(salt || "")}:${String(password || "")}`;
  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof TextEncoder !== "undefined"
  ) {
    const encoded = new TextEncoder().encode(payload);
    const digestBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToHex(new Uint8Array(digestBuffer));
  }
  return fallbackHash(payload);
};
