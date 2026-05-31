import { parse } from 'csv-parse/sync'

const expectedHeaders = [
  'cnpj',
  'nome_posto',
  'nome_fantasia',
  'bandeira',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'municipio',
  'uf',
  'cep',
  'cpf_responsavel',
  'nome_responsavel',
  'email_responsavel',
  'cargo_responsavel',
  'combustiveis',
  'status',
  'data_inauguracao',
  'numero_bicos',
  'numero_pistas',
  'observacoes',
] as const

const requiredFields = [
  'cnpj',
  'nome_posto',
  'bandeira',
  'logradouro',
  'bairro',
  'municipio',
  'uf',
  'cep',
  'cpf_responsavel',
  'nome_responsavel',
  'combustiveis',
  'status',
] as const

const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PostoRow = Record<(typeof expectedHeaders)[number], string>

export type ParsedPostoRow = PostoRow & {
  lineNumber: number
  errors: string[]
  warnings: string[]
  isValid: boolean
}

export type ParsePostosCsvResult = {
  fileName: string
  headers: string[]
  expectedHeaders: readonly string[]
  missingHeaders: string[]
  extraHeaders: string[]
  totalRows: number
  validRows: number
  invalidRows: number
  rows: ParsedPostoRow[]
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDigits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function normalizeHeader(value: unknown) {
  return normalizeText(value).toLowerCase()
}

function detectDelimiterFromHeaderLine(content: string) {
  const firstLine = content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)

  if (!firstLine) {
    return ';'
  }

  const candidates = [';', ',', '\t']
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length,
  }))

  return counts.sort((left, right) => right.count - left.count)[0]?.delimiter ?? ';'
}

function expandScientificNotation(value: string) {
  const match = value.match(/^(\d+)(?:[.,](\d+))?[eE]\+?(\d+)$/)

  if (!match) {
    return null
  }

  const integerPart = match[1]
  const fractionalPart = match[2] || ''
  const exponent = Number(match[3])
  const significantDigits = `${integerPart}${fractionalPart}`
  const zeroCount = exponent - fractionalPart.length

  if (Number.isNaN(exponent) || zeroCount < 0) {
    return null
  }

  return `${significantDigits}${'0'.repeat(zeroCount)}`
}

function normalizeDocumentField(value: unknown, label: string) {
  const normalizedValue = normalizeText(value)
  const scientificValue = expandScientificNotation(normalizedValue)

  if (scientificValue) {
    return {
      value: scientificValue,
      warning: `${label} veio em notacao cientifica e foi normalizado para visualizacao.`,
    }
  }

  return {
    value: normalizeDigits(normalizedValue),
    warning: '',
  }
}

function normalizeRow(rawRow: Record<string, unknown>) {
  const cnpjField = normalizeDocumentField(rawRow.cnpj, 'CNPJ')
  const cepField = normalizeDocumentField(rawRow.cep, 'CEP')
  const cpfField = normalizeDocumentField(rawRow.cpf_responsavel, 'CPF do responsavel')

  const row: PostoRow = {
    cnpj: cnpjField.value,
    nome_posto: normalizeText(rawRow.nome_posto),
    nome_fantasia: normalizeText(rawRow.nome_fantasia),
    bandeira: normalizeText(rawRow.bandeira),
    logradouro: normalizeText(rawRow.logradouro),
    numero: normalizeText(rawRow.numero),
    complemento: normalizeText(rawRow.complemento),
    bairro: normalizeText(rawRow.bairro),
    municipio: normalizeText(rawRow.municipio),
    uf: normalizeText(rawRow.uf).toUpperCase(),
    cep: cepField.value,
    cpf_responsavel: cpfField.value,
    nome_responsavel: normalizeText(rawRow.nome_responsavel),
    email_responsavel: normalizeText(rawRow.email_responsavel).toLowerCase(),
    cargo_responsavel: normalizeText(rawRow.cargo_responsavel),
    combustiveis: normalizeText(rawRow.combustiveis),
    status: normalizeText(rawRow.status).toUpperCase(),
    data_inauguracao: normalizeText(rawRow.data_inauguracao),
    numero_bicos: normalizeText(rawRow.numero_bicos),
    numero_pistas: normalizeText(rawRow.numero_pistas),
    observacoes: normalizeText(rawRow.observacoes),
  }

  const warnings = [cnpjField.warning, cepField.warning, cpfField.warning].filter(Boolean)

  return { row, warnings }
}

function validateRow(row: PostoRow) {
  const errors: string[] = []

  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push(`Campo obrigatorio ausente: ${field}.`)
    }
  }

  if (row.cnpj && row.cnpj.length !== 14) {
    errors.push('CNPJ deve conter 14 digitos.')
  }

  if (row.cep && row.cep.length !== 8) {
    errors.push('CEP deve conter 8 digitos.')
  }

  if (row.cpf_responsavel && row.cpf_responsavel.length !== 11) {
    errors.push('CPF do responsavel deve conter 11 digitos.')
  }

  if (row.uf && row.uf.length !== 2) {
    errors.push('UF deve conter 2 letras.')
  }

  if (row.email_responsavel && !basicEmailPattern.test(row.email_responsavel)) {
    errors.push('Email do responsavel esta em formato invalido.')
  }

  if (row.numero_bicos && Number.isNaN(Number(row.numero_bicos))) {
    errors.push('Numero de bicos deve ser numerico.')
  }

  if (row.numero_pistas && Number.isNaN(Number(row.numero_pistas))) {
    errors.push('Numero de pistas deve ser numerico.')
  }

  return errors
}

export function parsePostosCsv(buffer: Buffer, fileName: string): ParsePostosCsvResult {
  const content = buffer.toString('utf8')
  const delimiter = detectDelimiterFromHeaderLine(content)

  const records = parse(content, {
    bom: true,
    columns: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    info: true,
  }) as Array<{ record: Record<string, unknown>; info: { lines: number } }>

  if (!records.length) {
    throw new Error('O arquivo nao possui registros validos para processamento.')
  }

  const firstRecord = records[0]?.record ?? {}
  const headers = Object.keys(firstRecord).map(normalizeHeader)
  const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header))
  const extraHeaders = headers.filter((header) => !expectedHeaders.includes(header as never))

  if (missingHeaders.length) {
    throw new Error(`Cabecalho invalido. Colunas ausentes: ${missingHeaders.join(', ')}.`)
  }

  const rows = records.map(({ record, info }) => {
    const normalizedRecord = Object.entries(record).reduce<Record<string, unknown>>(
      (accumulator, [key, value]) => {
        accumulator[normalizeHeader(key)] = value
        return accumulator
      },
      {},
    )

    const { row, warnings } = normalizeRow(normalizedRecord)
    const errors = validateRow(row)

    return {
      ...row,
      lineNumber: info.lines,
      errors,
      warnings,
      isValid: errors.length === 0,
    }
  })

  const validRows = rows.filter((row) => row.isValid).length

  return {
    fileName,
    headers,
    expectedHeaders,
    missingHeaders,
    extraHeaders,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    rows,
  }
}
