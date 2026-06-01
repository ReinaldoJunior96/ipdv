<script setup>
import { inject, computed, ref } from 'vue'
import PostosImportCard from './components/PostosImportCard.vue'
import PostosPersistedTable from './components/PostosPersistedTable.vue'
import PostosPreviewTable from './components/PostosPreviewTable.vue'
import { POSTOS_API_KEY } from './lib/postosApi'

const postosApi = inject(POSTOS_API_KEY)
const fileInput = ref(null)
const isDragging = ref(false)
const isParsing = ref(false)
const isSubmitting = ref(false)
const isLoadingPersisted = ref(false)
const isClearingPersisted = ref(false)
const selectedFile = ref(null)
const validationError = ref('')
const importedRows = ref([])
const persistedRows = ref([])
const importResponse = ref(null)
const submitError = ref('')
const persistedError = ref('')

const columns = [
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'nome_posto', label: 'Nome do posto' },
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'bandeira', label: 'Bandeira' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: 'numero', label: 'Numero' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'municipio', label: 'Municipio' },
  { key: 'uf', label: 'UF' },
  { key: 'cep', label: 'CEP' },
  { key: 'cpf_responsavel', label: 'CPF responsavel' },
  { key: 'nome_responsavel', label: 'Nome responsavel' },
  { key: 'email_responsavel', label: 'Email responsavel' },
  { key: 'cargo_responsavel', label: 'Cargo responsavel' },
  { key: 'combustiveis', label: 'Combustiveis' },
  { key: 'status', label: 'Status' },
  { key: 'data_inauguracao', label: 'Data inauguracao' },
  { key: 'numero_bicos', label: 'Bicos' },
  { key: 'numero_pistas', label: 'Pistas' },
  { key: 'observacoes', label: 'Observacoes' },
]

const expectedHeaders = columns.map((column) => column.key)
const requiredRowFields = ['cnpj', 'nome_posto', 'municipio', 'uf', 'status']
const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const selectedFileLabel = computed(() => {
  if (!selectedFile.value) {
    return 'Nenhum arquivo selecionado'
  }

  const sizeInKb = (selectedFile.value.size / 1024).toFixed(1)
  return `${selectedFile.value.name} • ${sizeInKb} KB`
})

const validRowsCount = computed(() => {
  return importedRows.value.filter((row) => row.__isValid).length
})

const invalidRowsCount = computed(() => {
  return importedRows.value.length - validRowsCount.value
})

const canSubmit = computed(() => {
  return Boolean(selectedFile.value) && !isParsing.value && !isSubmitting.value
})

const persistedSummary = computed(() => {
  const total = persistedRows.value.length
  return `${total} posto${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`
})

function isCsvFile(file) {
  if (!file) {
    return false
  }

  const lowerName = file.name.toLowerCase()
  return lowerName.endsWith('.csv') || file.type === 'text/csv'
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

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

function normalizeOptionalEmail(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeDate(value) {
  return normalizeText(value).replace(/\s/g, '')
}

function detectDelimiter(headerLine) {
  const candidates = [',', ';', '\t']
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: headerLine.split(delimiter).length,
  }))

  return counts.sort((left, right) => right.count - left.count)[0].delimiter
}

function splitCsvLine(line, delimiter) {
  const values = []
  let currentValue = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === delimiter && !insideQuotes) {
      values.push(currentValue.trim())
      currentValue = ''
      continue
    }

    currentValue += char
  }

  values.push(currentValue.trim())
  return values
}

function parseCsv(text) {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  if (!normalizedText) {
    return { headers: [], rows: [] }
  }

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const rows = lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line, delimiter)

    const rawRow = headers.reduce((row, header, valueIndex) => {
      row[header] = values[valueIndex] || ''
      return row
    }, {})

    return { lineNumber: index + 2, rawRow }
  })

  return { headers, rows }
}

function normalizeRow(rawRow) {
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

function validateRow(row) {
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

async function parseAndStoreFile(file) {
  const text = await file.text()
  const { headers, rows } = parseCsv(text)

  if (!headers.length || !rows.length) {
    throw new Error('O arquivo nao possui cabecalho e registros validos para exibicao.')
  }

  const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header))

  if (missingHeaders.length) {
    throw new Error(`Cabecalho invalido. Colunas ausentes: ${missingHeaders.join(', ')}.`)
  }

  importedRows.value = rows.map(({ lineNumber, rawRow }) => {
    const normalizedRow = normalizeRow(rawRow)
    const rowErrors = validateRow(normalizedRow)

    return {
      ...normalizedRow,
      __lineNumber: lineNumber,
      __errors: rowErrors,
      __warnings: normalizedRow.__warnings,
      __isValid: rowErrors.length === 0,
    }
  })

  if (!importedRows.value.length) {
    throw new Error('O arquivo nao possui registros validos para exibicao.')
  }
}

async function setFile(file) {
  if (!isCsvFile(file)) {
    selectedFile.value = null
    importedRows.value = []
    validationError.value = 'Selecione um arquivo com extensao .csv.'
    submitError.value = ''
    importResponse.value = null
    return
  }

  isParsing.value = true
  validationError.value = ''
  submitError.value = ''
  importResponse.value = null

  try {
    await parseAndStoreFile(file)
    selectedFile.value = file
  } catch (error) {
    selectedFile.value = null
    importedRows.value = []
    validationError.value = error instanceof Error ? error.message : 'Falha ao ler o CSV.'
  } finally {
    isParsing.value = false
  }
}

function mapImportRows(rows) {
  return rows.map((row) => ({
    ...row,
    __lineNumber: row.lineNumber,
    __errors: row.errors,
    __warnings: row.warnings,
    __isValid: row.isValid,
  }))
}

async function submitToBackend() {
  if (!selectedFile.value || !postosApi) {
    return
  }

  isSubmitting.value = true
  submitError.value = ''
  importResponse.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const { data } = await postosApi.importCsv(formData)

    importResponse.value = data
    importedRows.value = mapImportRows(data.rows)
    await fetchPersistedPostos()
  } catch (error) {
    submitError.value =
      error?.response?.data?.message ||
      error?.message ||
      'Falha ao enviar o arquivo para o backend.'
  } finally {
    isSubmitting.value = false
  }
}

function mapPersistedRow(row) {
  return {
    ...row,
    combustiveis: Array.isArray(row.combustiveis) ? row.combustiveis.join(', ') : row.combustiveis || '-',
    data_inauguracao: row.data_inauguracao || '-',
    numero_bicos: row.numero_bicos ?? '-',
    numero_pistas: row.numero_pistas ?? '-',
    nome_fantasia: row.nome_fantasia || '-',
    numero: row.numero || '-',
    complemento: row.complemento || '-',
    email_responsavel: row.email_responsavel || '-',
    cargo_responsavel: row.cargo_responsavel || '-',
    observacoes: row.observacoes || '-',
  }
}

async function fetchPersistedPostos() {
  if (!postosApi) {
    return
  }

  isLoadingPersisted.value = true
  persistedError.value = ''

  try {
    const { data } = await postosApi.list()
    persistedRows.value = data.rows.map(mapPersistedRow)
  } catch (error) {
    persistedError.value =
      error?.response?.data?.message ||
      error?.message ||
      'Falha ao carregar os postos cadastrados.'
  } finally {
    isLoadingPersisted.value = false
  }
}

async function clearPersistedPostos() {
  if (!postosApi) {
    return
  }

  const confirmed = window.confirm(
    'Isso vai apagar todos os postos cadastrados e o historico de importacoes. Deseja continuar?',
  )

  if (!confirmed) {
    return
  }

  isClearingPersisted.value = true
  persistedError.value = ''

  try {
    const { data } = await postosApi.clear()
    persistedRows.value = []
    importResponse.value = null
    selectedFile.value = null
    importedRows.value = []
    validationError.value = ''
    submitError.value = ''
    persistedError.value = data.message || 'Dados cadastrados limpos com sucesso.'
  } catch (error) {
    persistedError.value =
      error?.response?.data?.message ||
      error?.message ||
      'Falha ao limpar os dados cadastrados.'
  } finally {
    isClearingPersisted.value = false
  }
}

function exportPostos() {
  persistedError.value = ''
  const link = document.createElement('a')
  link.href = postosApi?.exportUrl() || '#'
  link.target = '_blank'
  link.rel = 'noopener'
  link.click()
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelection(event) {
  const [file] = event.target.files || []
  void setFile(file)
}

function handleDrop(event) {
  isDragging.value = false
  const [file] = event.dataTransfer?.files || []
  void setFile(file)
}

void fetchPersistedPostos()
</script>

<template>
  <v-app>
    <v-main>
      <div class="home-shell">
        <v-container class="page-container py-8">
          <v-row justify="center">
            <v-col cols="12" lg="10" xl="9">
              <PostosImportCard
                :file-label="selectedFileLabel"
                :is-parsing="isParsing"
                :is-submitting="isSubmitting"
                :validation-error="validationError"
                :submit-error="submitError"
                :import-response="importResponse"
                :selected-file="selectedFile"
                :invalid-rows-count="invalidRowsCount"
                :valid-rows-count="validRowsCount"
                :imported-rows-count="importedRows.length"
                :can-submit="canSubmit"
                :is-dragging="isDragging"
                @open-file-picker="openFilePicker"
                @submit="submitToBackend"
                @drag-state="isDragging = $event"
                @drop-file="handleDrop"
              />

              <input
                ref="fileInput"
                class="sr-only"
                type="file"
                accept=".csv,text/csv"
                @change="handleFileSelection"
              />

              <PostosPreviewTable
                :columns="columns"
                :rows="importedRows"
              />

              <PostosPersistedTable
                :columns="columns"
                :rows="persistedRows"
                :is-loading="isLoadingPersisted"
                :is-clearing="isClearingPersisted"
                :error-message="persistedError"
                :summary="persistedSummary"
                @refresh="fetchPersistedPostos"
                @export="exportPostos"
                @clear="clearPersistedPostos"
              />
            </v-col>
          </v-row>
        </v-container>
      </div>
    </v-main>
  </v-app>
</template>
