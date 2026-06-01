// Adapta o retorno do backend para o formato esperado pela tabela de preview.
export function mapImportRows(rows) {
  return rows.map((row) => ({
    ...row,
    __lineNumber: row.lineNumber,
    __errors: row.errors,
    __warnings: row.warnings,
    __isValid: row.isValid,
  }))
}

// Normaliza os dados persistidos para uma exibição mais amigável na tabela.
export function mapPersistedRow(row) {
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
