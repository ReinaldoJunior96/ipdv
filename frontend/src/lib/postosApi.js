import { resolveApiBaseUrl } from './apiConfig'

export const POSTOS_API_KEY = Symbol('postos-api')

export function createPostosApi(httpClient) {
  return {
    importCsv(formData) {
      return httpClient.post('/importacoes/postos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },

    list() {
      return httpClient.get('/postos')
    },

    clear() {
      return httpClient.delete('/postos')
    },

    exportUrl() {
      return `${resolveApiBaseUrl()}/postos/exportar`
    },
  }
}
