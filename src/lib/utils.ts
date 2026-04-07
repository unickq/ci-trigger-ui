export function createId() {
  return crypto.randomUUID()
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}