import axios from 'axios'

export const HTTP_CLIENT_KEY = Symbol('http-client')

export function resolveApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000'
}

export function createHttpClient() {
  return axios.create({
    baseURL: resolveApiBaseUrl(),
  })
}
