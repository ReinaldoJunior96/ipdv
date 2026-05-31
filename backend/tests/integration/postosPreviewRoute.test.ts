import { describe, expect, it } from 'vitest'
import { handlePostosPreview } from '../../src/imports/postosPreviewHandler.js'
import { createValidRow, expectedHeaders, toCsv } from '../helpers/postosCsvFixture.js'

function createResponseMock() {
  const response = {
    statusCode: 200,
    body: null as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }

  return response
}

describe('POST /importacoes/postos/preview', () => {
  it('retorna 400 quando nenhum arquivo e enviado', () => {
    const req = {}
    const res = createResponseMock()

    handlePostosPreview(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toBe('Envie um arquivo CSV no campo "file".')
  })

  it('retorna 400 quando extensao do arquivo e invalida', () => {
    const req = {
      file: {
        originalname: 'postos.txt',
        buffer: Buffer.from('conteudo qualquer'),
      },
    }
    const res = createResponseMock()

    handlePostosPreview(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toBe('Apenas arquivos .csv sao aceitos.')
  })

  it('retorna 200 para csv valido', () => {
    const req = {
      file: {
        originalname: 'postos.csv',
        buffer: Buffer.from(toCsv([createValidRow()])),
      },
    }
    const res = createResponseMock()

    handlePostosPreview(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.validRows).toBe(1)
    expect(res.body.invalidRows).toBe(0)
  })

  it('retorna 200 com invalidRows maior que zero quando ha erros de linha', () => {
    const req = {
      file: {
        originalname: 'postos.csv',
        buffer: Buffer.from(toCsv([createValidRow({ bairro: '' })])),
      },
    }
    const res = createResponseMock()

    handlePostosPreview(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.invalidRows).toBeGreaterThan(0)
    expect(res.body.rows[0].errors).toContain('Campo obrigatorio ausente: bairro.')
  })

  it('retorna 400 quando o header e invalido', () => {
    const headersWithoutBairro = expectedHeaders.filter((header) => header !== 'bairro')
    const req = {
      file: {
        originalname: 'postos.csv',
        buffer: Buffer.from(toCsv([createValidRow()], { headers: headersWithoutBairro })),
      },
    }
    const res = createResponseMock()

    handlePostosPreview(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toBe('Cabecalho invalido. Colunas ausentes: bairro.')
  })
})
