export function resolveApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000'
}
