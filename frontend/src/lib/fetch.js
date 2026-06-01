import { resolveApiBaseUrl } from './apiConfig'

export function createHttpClient() {
  const baseURL = resolveApiBaseUrl()

  return {
    async get(path) {
      const response = await fetch(`${baseURL}${path}`)
      const data = await response.json()

      if (!response.ok) {
        throw { response: { data }, message: data?.message || 'Falha na requisicao.' }
      }

      return { data }
    },

    async post(path, body, options = {}) {
      const response = await fetch(`${baseURL}${path}`, {
        method: 'POST',
        body,
        headers: options.headers,
      })
      const data = await response.json()

      if (!response.ok) {
        throw { response: { data }, message: data?.message || 'Falha na requisicao.' }
      }

      return { data }
    },

    async delete(path) {
      const response = await fetch(`${baseURL}${path}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw { response: { data }, message: data?.message || 'Falha na requisicao.' }
      }

      return { data }
    },
  }
}
