import { describe, expect, it } from 'vitest'
import { parsePostosCsv } from '../../src/imports/postosCsv.js'
import { createValidRow, expectedHeaders, toCsv } from '../helpers/postosCsvFixture.js'

function parseCsvContent(csv: string, fileName = 'postos.csv') {
  return parsePostosCsv(Buffer.from(csv, 'utf8'), fileName)
}

describe('parsePostosCsv', () => {
  it('processa CSV valido com 1 linha', () => {
    const result = parseCsvContent(toCsv([createValidRow()]))

    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(0)
    expect(result.rows[0]?.isValid).toBe(true)
  })

  it('falha quando coluna obrigatoria falta no header', () => {
    const headersWithoutBairro = expectedHeaders.filter((header) => header !== 'bairro')
    const csv = toCsv([createValidRow()], { headers: headersWithoutBairro })

    expect(() => parseCsvContent(csv)).toThrow('Cabecalho invalido. Colunas ausentes: bairro.')
  })

  it('marca erro quando valor obrigatorio vem vazio na linha', () => {
    const result = parseCsvContent(toCsv([createValidRow({ bairro: '' })]))

    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]?.errors).toContain('Campo obrigatorio ausente: bairro.')
  })

  it('normaliza cnpj em notacao cientifica', () => {
    const result = parseCsvContent(toCsv([createValidRow({ cnpj: '1,02346E+13' })]))

    expect(result.rows[0]?.cnpj).toBe('10234600000000')
    expect(result.rows[0]?.warnings).toContain(
      'CNPJ veio em notacao cientifica e foi normalizado para visualizacao.',
    )
  })

  it('marca erro quando uf e invalida', () => {
    const result = parseCsvContent(toCsv([createValidRow({ uf: 'Ceara' })]))

    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]?.errors).toContain('UF deve conter 2 letras.')
  })

  it('marca erro quando email_responsavel e invalido', () => {
    const result = parseCsvContent(toCsv([createValidRow({ email_responsavel: 'maria sem arroba' })]))

    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]?.errors).toContain('Email do responsavel esta em formato invalido.')
  })

  it('marca erro quando numero_bicos nao e numerico', () => {
    const result = parseCsvContent(toCsv([createValidRow({ numero_bicos: 'quatro' })]))

    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]?.errors).toContain('Numero de bicos deve ser numerico.')
  })

  it('processa csv com delimitador ponto e virgula', () => {
    const result = parseCsvContent(toCsv([createValidRow()], { delimiter: ';' }))

    expect(result.validRows).toBe(1)
    expect(result.rows[0]?.municipio).toBe('Fortaleza')
  })

  it('falha para csv vazio', () => {
    expect(() => parseCsvContent('')).toThrow('O arquivo nao possui registros validos para processamento.')
  })

  it('aceita colunas extras sem quebrar importacao', () => {
    const headers = [...expectedHeaders, 'coluna_extra']
    const csv = `${headers.join(';')}\n${[
      ...expectedHeaders.map((header) => createValidRow()[header]),
      'valor-extra',
    ].join(';')}`

    const result = parseCsvContent(csv)

    expect(result.validRows).toBe(1)
    expect(result.extraHeaders).toContain('coluna_extra')
  })
})
