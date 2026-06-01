// Verifica se o arquivo selecionado tem formato CSV.
export function isCsvFile(file) {
  if (!file) {
    return false
  }

  const lowerName = file.name.toLowerCase()
  return lowerName.endsWith('.csv') || file.type === 'text/csv'
}

// Normaliza o nome de uma coluna do CSV para comparação.
function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase()
}

// Detecta o delimitador mais provável a partir do cabeçalho.
function detectDelimiter(headerLine) {
  const candidates = [',', ';', '\t']
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: headerLine.split(delimiter).length,
  }))

  return counts.sort((left, right) => right.count - left.count)[0].delimiter
}

// Divide uma linha CSV respeitando campos entre aspas.
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

// Converte o texto bruto do CSV em cabeçalhos e linhas estruturadas.
export function parseCsv(text) {
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
