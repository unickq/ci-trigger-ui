export function createId() {
  return crypto.randomUUID();
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

/** Extracts a human-readable message from raw API error strings like "401: {"message":"Bad credentials",...}" */
export function parseErrorMessage(raw: string): string {
  try {
    const jsonPart = raw.includes(": ") ? raw.slice(raw.indexOf(": ") + 2) : raw;
    const parsed = JSON.parse(jsonPart);
    if (parsed.message) return `${raw.split(":")[0]}: ${parsed.message}`;
  } catch {
    // not JSON - return as-is
  }
  return raw;
}
