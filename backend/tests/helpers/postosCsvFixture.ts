export const expectedHeaders = [
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

export function createValidRow(overrides: Partial<Record<(typeof expectedHeaders)[number], string>> = {}) {
  return {
    cnpj: '10234600000000',
    nome_posto: 'Posto Exemplo LTDA',
    nome_fantasia: 'Posto Exemplo',
    bandeira: 'Shell',
    logradouro: 'Rua A',
    numero: '100',
    complemento: '',
    bairro: 'Centro',
    municipio: 'Fortaleza',
    uf: 'CE',
    cep: '60000000',
    cpf_responsavel: '12345678901',
    nome_responsavel: 'Maria Teste',
    email_responsavel: 'maria@teste.com',
    cargo_responsavel: 'Gerente',
    combustiveis: 'Gasolina,Etanol',
    status: 'ativo',
    data_inauguracao: '01/01/2020',
    numero_bicos: '4',
    numero_pistas: '2',
    observacoes: 'Observacao de teste.',
    ...overrides,
  }
}

export function toCsv(
  rows: Array<Partial<Record<(typeof expectedHeaders)[number], string>>>,
  options: {
    delimiter?: ';' | ',' | '\t'
    headers?: string[]
  } = {},
) {
  const delimiter = options.delimiter ?? ';'
  const headers = options.headers ?? [...expectedHeaders]
  const lines = [headers.join(delimiter)]

  for (const row of rows) {
    const mergedRow = createValidRow(row)
    lines.push(headers.map((header) => mergedRow[header as keyof typeof mergedRow] ?? '').join(delimiter))
  }

  return lines.join('\n')
}
