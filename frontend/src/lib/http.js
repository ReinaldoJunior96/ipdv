import axios from 'axios'
import { resolveApiBaseUrl } from './apiConfig'

export function createHttpClient() {
  return axios.create({
    baseURL: resolveApiBaseUrl(),
  })
}
