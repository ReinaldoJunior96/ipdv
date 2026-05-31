<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'

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
const searchTerm = ref('')
const selectedUf = ref(null)
const selectedStatus = ref(null)
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

const importedSummary = computed(() => {
  const total = importedRows.value.length
  if (!total) {
    return 'Nenhum posto importado ainda'
  }

  return `${total} posto${total > 1 ? 's' : ''} carregado${total > 1 ? 's' : ''}`
})

const validRowsCount = computed(() => {
  return importedRows.value.filter((row) => row.__isValid).length
})

const invalidRowsCount = computed(() => {
  return importedRows.value.length - validRowsCount.value
})

const ufOptions = computed(() => {
  return [...new Set(importedRows.value.map((row) => row.uf).filter(Boolean))].sort()
})

const statusOptions = computed(() => {
  return [...new Set(importedRows.value.map((row) => row.status).filter(Boolean))].sort()
})

const filteredRows = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  return importedRows.value.filter((row) => {
    const matchesUf = !selectedUf.value || row.uf === selectedUf.value
    const matchesStatus = !selectedStatus.value || row.status === selectedStatus.value
    const matchesSearch =
      !normalizedSearch ||
      columns.some((column) =>
        String(row[column.key] || '')
          .toLowerCase()
          .includes(normalizedSearch),
      ) ||
      row.__errors.some((error) => error.toLowerCase().includes(normalizedSearch)) ||
      row.__warnings.some((warning) => warning.toLowerCase().includes(normalizedSearch))

    return matchesUf && matchesStatus && matchesSearch
  })
})

const filteredSummary = computed(() => {
  if (!importedRows.value.length) {
    return ''
  }

  return `${filteredRows.value.length} de ${importedRows.value.length} registro${importedRows.value.length > 1 ? 's' : ''}`
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
  return String(value || '')
    .trim()
    .toLowerCase()
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
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

    return {
      lineNumber: index + 2,
      rawRow,
    }
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
    searchTerm.value = ''
    selectedUf.value = null
    selectedStatus.value = null
  } catch (error) {
    selectedFile.value = null
    importedRows.value = []
    validationError.value = error instanceof Error ? error.message : 'Falha ao ler o CSV.'
  } finally {
    isParsing.value = false
  }
}

async function submitToBackend() {
  if (!selectedFile.value) {
    return
  }

  isSubmitting.value = true
  submitError.value = ''
  importResponse.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const { data } = await axios.post(`${apiBaseUrl}/importacoes/postos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    importResponse.value = data
    importedRows.value = data.rows.map((row) => ({
      ...row,
      __lineNumber: row.lineNumber,
      __errors: row.errors,
      __warnings: row.warnings,
      __isValid: row.isValid,
    }))
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
  isLoadingPersisted.value = true
  persistedError.value = ''

  try {
    const { data } = await axios.get(`${apiBaseUrl}/postos`)
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
  const confirmed = window.confirm(
    'Isso vai apagar todos os postos cadastrados e o historico de importacoes. Deseja continuar?',
  )

  if (!confirmed) {
    return
  }

  isClearingPersisted.value = true
  persistedError.value = ''

  try {
    const { data } = await axios.delete(`${apiBaseUrl}/postos`)
    persistedRows.value = []
    importResponse.value = null
    selectedFile.value = null
    importedRows.value = []
    validationError.value = ''
    submitError.value = ''
    searchTerm.value = ''
    selectedUf.value = null
    selectedStatus.value = null
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
  link.href = `${apiBaseUrl}/postos/exportar`
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

onMounted(() => {
  void fetchPersistedPostos()
})
</script>

<template>
  <v-app>
    <v-main>
      <div class="home-shell">
        <v-container class="page-container py-8">
          <v-row justify="center">
            <v-col cols="12" lg="10" xl="9">
              <v-card class="home-card" rounded="xl" elevation="0">
                <div class="eyebrow">Importacao CSV</div>
                <div class="hero-header">
                  <div>
                    <h1 class="home-title">Importar e visualizar postos</h1>
                    <p class="home-subtitle">
                      Envie um arquivo <strong>.csv</strong>, valide os dados na interface e
                      confira os registros antes do envio real ao backend.
                    </p>
                  </div>

                  <v-chip color="secondary" text-color="primary" variant="flat">
                    {{ importedSummary }}
                  </v-chip>
                </div>

                <div
                  class="dropzone"
                  :class="{ 'dropzone-active': isDragging }"
                  @click="openFilePicker"
                  @dragenter.prevent="isDragging = true"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <v-icon icon="mdi-file-delimited-outline" size="40" color="primary" />
                  <div class="dropzone-title">Arraste o arquivo CSV aqui</div>
                  <div class="dropzone-text">ou clique para selecionar um arquivo</div>

                  <v-chip class="mt-3" color="secondary" text-color="primary" variant="flat">
                    Aceita apenas .csv
                  </v-chip>
                </div>

                <input
                  ref="fileInput"
                  class="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  @change="handleFileSelection"
                />

                <div class="feedback-block">
                  <v-progress-linear
                    v-if="isParsing"
                    color="primary"
                    indeterminate
                    rounded
                  />

                  <v-progress-linear
                    v-else-if="isSubmitting"
                    color="primary"
                    indeterminate
                    rounded
                  />

                  <v-alert
                    v-else-if="validationError"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    {{ validationError }}
                  </v-alert>

                  <v-alert
                    v-else-if="submitError"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    {{ submitError }}
                  </v-alert>

                  <v-alert
                    v-else-if="importResponse"
                    :type="importResponse.invalidRows > 0 ? 'warning' : 'success'"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    {{ importResponse.message }}
                    <template v-if="typeof importResponse.importedPostos === 'number'">
                      {{ ' ' }}{{ importResponse.importedPostos }} posto(s) cadastrado(s) no banco.
                    </template>
                  </v-alert>

                  <v-alert
                    v-else-if="selectedFile && invalidRowsCount"
                    type="warning"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    Arquivo carregado com pendencias: {{ invalidRowsCount }} linha(s) com erro e
                    {{ validRowsCount }} valida(s).
                  </v-alert>

                  <v-alert
                    v-else-if="selectedFile"
                    type="success"
                    variant="tonal"
                    density="comfortable"
                    rounded="lg"
                  >
                    Arquivo carregado: {{ selectedFileLabel }}
                  </v-alert>

                  <v-sheet
                    v-else
                    class="file-placeholder"
                    color="transparent"
                    rounded="lg"
                  >
                    {{ selectedFileLabel }}
                  </v-sheet>
                </div>

                <div v-if="importedRows.length" class="validation-summary">
                  <v-chip color="success" variant="tonal">
                    {{ validRowsCount }} linha(s) validas
                  </v-chip>
                  <v-chip color="warning" variant="tonal">
                    {{ invalidRowsCount }} linha(s) com erro
                  </v-chip>
                </div>

                <div class="actions">
                  <v-btn color="primary" size="large" rounded="pill" @click="openFilePicker">
                    Selecionar arquivo
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="large"
                    rounded="pill"
                    :loading="isSubmitting"
                    :disabled="!canSubmit"
                    @click="submitToBackend"
                  >
                    Cadastrar no banco
                  </v-btn>
                </div>
              </v-card>

              <v-card class="table-card mt-5" rounded="xl" elevation="0">
                <div class="table-header">
                  <div>
                    <h2 class="section-title">Postos importados</h2>
                    <p class="section-subtitle">
                      Pre-visualizacao com normalizacao leve e erros simples por linha.
                    </p>
                  </div>
                </div>

                <div v-if="importedRows.length" class="filters-bar">
                  <v-text-field
                    v-model="searchTerm"
                    label="Buscar na tabela"
                    placeholder="CNPJ, nome, municipio, responsavel ou erro..."
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                    clearable
                  />

                  <v-select
                    v-model="selectedUf"
                    :items="ufOptions"
                    label="UF"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                  />

                  <v-select
                    v-model="selectedStatus"
                    :items="statusOptions"
                    label="Status"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </div>

                <div v-if="importedRows.length" class="filters-summary">
                  {{ filteredSummary }}
                </div>

                <v-sheet
                  v-if="filteredRows.length"
                  class="table-wrapper"
                  rounded="lg"
                  border
                >
                  <v-table density="comfortable" fixed-header height="460">
                    <thead>
                      <tr>
                        <th>Validacao</th>
                        <th>Linha</th>
                        <th v-for="column in columns" :key="column.key">
                          {{ column.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, index) in filteredRows"
                        :key="`${row.cnpj}-${index}-${row.__lineNumber}`"
                        :class="{ 'row-invalid': !row.__isValid }"
                      >
                        <td class="validation-cell">
                          <v-chip
                            :color="row.__isValid ? 'success' : 'warning'"
                            size="small"
                            variant="tonal"
                          >
                            {{ row.__isValid ? 'Valido' : 'Com erro' }}
                          </v-chip>
                          <div v-if="row.__errors.length" class="row-errors">
                            <div v-for="error in row.__errors" :key="error">
                              {{ error }}
                            </div>
                          </div>
                          <div v-if="row.__warnings.length" class="row-warnings">
                            <div v-for="warning in row.__warnings" :key="warning">
                              {{ warning }}
                            </div>
                          </div>
                        </td>
                        <td>{{ row.__lineNumber }}</td>
                        <td v-for="column in columns" :key="column.key">
                          {{ row[column.key] || '-' }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-sheet>

                <v-sheet
                  v-else-if="importedRows.length"
                  class="empty-state"
                  color="transparent"
                  rounded="lg"
                >
                  <v-icon icon="mdi-filter-off-outline" size="34" color="primary" />
                  <div class="empty-title">Nenhum resultado para os filtros atuais</div>
                  <div class="empty-text">
                    Ajuste a busca, a UF ou o status para localizar os registros desejados.
                  </div>
                </v-sheet>

                <v-sheet
                  v-else
                  class="empty-state"
                  color="transparent"
                  rounded="lg"
                >
                  <v-icon icon="mdi-database-eye-outline" size="34" color="primary" />
                  <div class="empty-title">Nenhum dado para mostrar</div>
                  <div class="empty-text">
                    Envie um CSV valido para visualizar os postos importados nesta tela.
                  </div>
                </v-sheet>
              </v-card>

              <v-card class="table-card mt-5" rounded="xl" elevation="0">
                <div class="table-header persisted-header">
                  <div>
                    <h2 class="section-title">Postos cadastrados no banco</h2>
                    <p class="section-subtitle">
                      Lista simples dos registros persistidos no PostgreSQL.
                    </p>
                  </div>

                  <div class="persisted-actions">
                    <v-chip color="secondary" text-color="primary" variant="flat">
                      {{ persistedSummary }}
                    </v-chip>
                    <v-btn
                      color="error"
                      variant="tonal"
                      rounded="pill"
                      :loading="isClearingPersisted"
                      @click="clearPersistedPostos"
                    >
                      Limpar banco
                    </v-btn>
                    <v-btn
                      color="primary"
                      variant="flat"
                      rounded="pill"
                      @click="exportPostos"
                    >
                      Exportar dados
                    </v-btn>
                    <v-btn
                      color="primary"
                      variant="outlined"
                      rounded="pill"
                      :loading="isLoadingPersisted"
                      @click="fetchPersistedPostos"
                    >
                      Atualizar lista
                    </v-btn>
                  </div>
                </div>

                <v-alert
                  v-if="persistedError"
                  class="mb-4"
                  :type="persistedRows.length ? 'error' : 'success'"
                  variant="tonal"
                  density="comfortable"
                  rounded="lg"
                >
                  {{ persistedError }}
                </v-alert>

                <v-progress-linear
                  v-else-if="isLoadingPersisted"
                  color="primary"
                  indeterminate
                  rounded
                  class="mb-4"
                />

                <v-sheet
                  v-if="persistedRows.length"
                  class="table-wrapper"
                  rounded="lg"
                  border
                >
                  <v-table density="comfortable" fixed-header height="420">
                    <thead>
                      <tr>
                        <th v-for="column in columns" :key="`persisted-${column.key}`">
                          {{ column.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in persistedRows" :key="`persisted-${row.id}`">
                        <td v-for="column in columns" :key="`persisted-${row.id}-${column.key}`">
                          {{ row[column.key] || '-' }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-sheet>

                <v-sheet
                  v-else-if="!isLoadingPersisted"
                  class="empty-state"
                  color="transparent"
                  rounded="lg"
                >
                  <v-icon icon="mdi-database-outline" size="34" color="primary" />
                  <div class="empty-title">Nenhum posto cadastrado ainda</div>
                  <div class="empty-text">
                    Importe um CSV para persistir os dados e visualizar os postos nesta lista.
                  </div>
                </v-sheet>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </v-main>
  </v-app>
</template>
