// Define os campos mínimos exigidos no preview local.
const requiredRowFields = ['cnpj', 'nome_posto', 'municipio', 'uf', 'status']

// Usa uma validação simples para emails informados no arquivo.
const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Remove espaços extras e padroniza textos vindos do CSV.
function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

// Mantém apenas os dígitos de campos numéricos textuais.
function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

// Expande valores em notação científica para uma string numérica.
function expandScientificNotation(value) {
  const normalizedValue = normalizeText(value)
  const scientificMatch = normalizedValue.match(/^(\d+)(?:[.,](\d+))?[eE]\+?(\d+)$/)

  if (!scientificMatch) {
    return null
  }

  const integerPart = scientificMatch[1]
  const fractionalPart = scientificMatch[2] || ''
  const exponent = Number(scientificMatch[3])
  const significantDigits = `${integerPart}${fractionalPart}`
  const zeroCount = exponent - fractionalPart.length

  if (Number.isNaN(exponent) || zeroCount < 0) {
    return null
  }

  return `${significantDigits}${'0'.repeat(zeroCount)}`
}

// Normaliza documentos e registra aviso quando vierem em notação científica.
function normalizeDocumentField(value, label) {
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

// Normaliza o email opcional para comparação e exibição.
function normalizeOptionalEmail(value) {
  return normalizeText(value).toLowerCase()
}

// Remove espaços da data para manter o valor consistente no preview.
function normalizeDate(value) {
  return normalizeText(value).replace(/\s/g, '')
}

// Normaliza uma linha bruta do CSV para o formato usado na tela.
export function normalizeRow(rawRow) {
  const cnpjField = normalizeDocumentField(rawRow.cnpj, 'CNPJ')
  const cepField = normalizeDocumentField(rawRow.cep, 'CEP')
  const cpfField = normalizeDocumentField(rawRow.cpf_responsavel, 'CPF do responsavel')

  return {
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
    email_responsavel: normalizeOptionalEmail(rawRow.email_responsavel),
    cargo_responsavel: normalizeText(rawRow.cargo_responsavel),
    combustiveis: normalizeText(rawRow.combustiveis),
    status: normalizeText(rawRow.status).toUpperCase(),
    data_inauguracao: normalizeDate(rawRow.data_inauguracao),
    numero_bicos: normalizeText(rawRow.numero_bicos),
    numero_pistas: normalizeText(rawRow.numero_pistas),
    observacoes: normalizeText(rawRow.observacoes),
    __warnings: [cnpjField.warning, cepField.warning, cpfField.warning].filter(Boolean),
  }
}

// Aplica as regras de validação local sobre a linha normalizada.
export function validateRow(row) {
  const errors = []

  for (const field of requiredRowFields) {
    if (!row[field]) {
      errors.push(`Campo obrigatorio ausente: ${field}.`)
    }
  }

  if (row.cnpj && row.cnpj.length !== 14) {
    errors.push('CNPJ deve conter 14 digitos.')
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
