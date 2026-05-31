import type { PoolClient } from 'pg'
import { pool } from '../db/pool.js'
import { parsePostosCsv, type ParsedPostoRow } from './postosCsv.js'

type ImportStatus = 'concluida' | 'concluida_parcial'

function parseOptionalInteger(value: string) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseOptionalDate(value: string) {
  if (!value) {
    return null
  }

  const normalized = value.trim()

  const slashMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return normalized
  }

  return null
}

function splitCombustiveis(value: string) {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}

async function upsertBandeira(client: PoolClient, nome: string) {
  const { rows } = await client.query<{ id: number }>(
    `
      INSERT INTO bandeiras (nome)
      VALUES ($1)
      ON CONFLICT (nome)
      DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id
    `,
    [nome],
  )

  return rows[0].id
}

async function upsertResponsavel(
  client: PoolClient,
  row: ParsedPostoRow,
) {
  const { rows } = await client.query<{ id: number }>(
    `
      INSERT INTO responsaveis (cpf, nome, email, cargo, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (cpf)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        cargo = EXCLUDED.cargo,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [
      row.cpf_responsavel,
      row.nome_responsavel,
      row.email_responsavel || null,
      row.cargo_responsavel || null,
    ],
  )

  return rows[0].id
}

async function upsertPosto(
  client: PoolClient,
  row: ParsedPostoRow,
  bandeiraId: number,
  responsavelId: number,
) {
  const { rows } = await client.query<{ id: number }>(
    `
      INSERT INTO postos (
        cnpj,
        nome_posto,
        nome_fantasia,
        bandeira_id,
        responsavel_id,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
        cep,
        status,
        data_inauguracao,
        numero_bicos,
        numero_pistas,
        observacoes,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
      )
      ON CONFLICT (cnpj)
      DO UPDATE SET
        nome_posto = EXCLUDED.nome_posto,
        nome_fantasia = EXCLUDED.nome_fantasia,
        bandeira_id = EXCLUDED.bandeira_id,
        responsavel_id = EXCLUDED.responsavel_id,
        logradouro = EXCLUDED.logradouro,
        numero = EXCLUDED.numero,
        complemento = EXCLUDED.complemento,
        bairro = EXCLUDED.bairro,
        municipio = EXCLUDED.municipio,
        uf = EXCLUDED.uf,
        cep = EXCLUDED.cep,
        status = EXCLUDED.status,
        data_inauguracao = EXCLUDED.data_inauguracao,
        numero_bicos = EXCLUDED.numero_bicos,
        numero_pistas = EXCLUDED.numero_pistas,
        observacoes = EXCLUDED.observacoes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [
      row.cnpj,
      row.nome_posto,
      row.nome_fantasia || null,
      bandeiraId,
      responsavelId,
      row.logradouro,
      row.numero || null,
      row.complemento || null,
      row.bairro,
      row.municipio,
      row.uf,
      row.cep,
      row.status,
      parseOptionalDate(row.data_inauguracao),
      parseOptionalInteger(row.numero_bicos),
      parseOptionalInteger(row.numero_pistas),
      row.observacoes || null,
    ],
  )

  return rows[0].id
}

async function syncCombustiveis(
  client: PoolClient,
  postoId: number,
  combustiveis: string[],
) {
  await client.query('DELETE FROM posto_combustiveis WHERE posto_id = $1', [postoId])

  for (const combustivel of combustiveis) {
    const combustivelResult = await client.query<{ id: number }>(
      `
        INSERT INTO combustiveis (nome)
        VALUES ($1)
        ON CONFLICT (nome)
        DO UPDATE SET nome = EXCLUDED.nome
        RETURNING id
      `,
      [combustivel],
    )

    const combustivelId = combustivelResult.rows[0].id

    await client.query(
      `
        INSERT INTO posto_combustiveis (posto_id, combustivel_id)
        VALUES ($1, $2)
        ON CONFLICT (posto_id, combustivel_id) DO NOTHING
      `,
      [postoId, combustivelId],
    )
  }
}

async function insertStagingRows(
  client: PoolClient,
  importacaoId: number,
  rows: ParsedPostoRow[],
) {
  for (const row of rows) {
    const errorMessages = [...row.errors, ...row.warnings].join(' | ')

    await client.query(
      `
        INSERT INTO staging_postos (
          importacao_id,
          linha_origem,
          cnpj,
          nome_posto,
          nome_fantasia,
          bandeira,
          logradouro,
          numero,
          complemento,
          bairro,
          municipio,
          uf,
          cep,
          cpf_responsavel,
          nome_responsavel,
          email_responsavel,
          cargo_responsavel,
          combustiveis,
          status,
          data_inauguracao,
          numero_bicos,
          numero_pistas,
          observacoes,
          valido,
          erro_validacao
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25
        )
      `,
      [
        importacaoId,
        row.lineNumber,
        row.cnpj,
        row.nome_posto,
        row.nome_fantasia || null,
        row.bandeira,
        row.logradouro,
        row.numero || null,
        row.complemento || null,
        row.bairro,
        row.municipio,
        row.uf,
        row.cep,
        row.cpf_responsavel,
        row.nome_responsavel,
        row.email_responsavel || null,
        row.cargo_responsavel || null,
        row.combustiveis,
        row.status,
        row.data_inauguracao || null,
        row.numero_bicos || null,
        row.numero_pistas || null,
        row.observacoes || null,
        row.isValid,
        errorMessages || null,
      ],
    )
  }
}

async function persistValidRows(client: PoolClient, rows: ParsedPostoRow[]) {
  let importedPostos = 0

  for (const row of rows.filter((item) => item.isValid)) {
    const bandeiraId = await upsertBandeira(client, row.bandeira)
    const responsavelId = await upsertResponsavel(client, row)
    const postoId = await upsertPosto(client, row, bandeiraId, responsavelId)

    await syncCombustiveis(client, postoId, splitCombustiveis(row.combustiveis))
    importedPostos += 1
  }

  return importedPostos
}

async function createImportacao(client: PoolClient, fileName: string) {
  const { rows } = await client.query<{ id: number }>(
    `
      INSERT INTO importacoes (nome_arquivo, status)
      VALUES ($1, 'processando')
      RETURNING id
    `,
    [fileName],
  )

  return rows[0].id
}

async function finalizeImportacao(
  client: PoolClient,
  importacaoId: number,
  status: ImportStatus,
  totalRows: number,
  validRows: number,
  invalidRows: number,
  importedPostos: number,
) {
  const mensagem =
    invalidRows > 0
      ? `Importacao concluida com pendencias. ${importedPostos} posto(s) persistido(s) e ${invalidRows} linha(s) invalida(s).`
      : `Importacao concluida com sucesso. ${importedPostos} posto(s) persistido(s).`

  await client.query(
    `
      UPDATE importacoes
      SET
        status = $2,
        total_linhas = $3,
        total_validas = $4,
        total_invalidas = $5,
        mensagem = $6,
        finished_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [importacaoId, status, totalRows, validRows, invalidRows, mensagem],
  )
}

export async function importPostosCsv(buffer: Buffer, fileName: string) {
  const parseResult = parsePostosCsv(buffer, fileName)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const importacaoId = await createImportacao(client, fileName)
    await insertStagingRows(client, importacaoId, parseResult.rows)
    const importedPostos = await persistValidRows(client, parseResult.rows)

    const status: ImportStatus =
      parseResult.invalidRows > 0 ? 'concluida_parcial' : 'concluida'

    await finalizeImportacao(
      client,
      importacaoId,
      status,
      parseResult.totalRows,
      parseResult.validRows,
      parseResult.invalidRows,
      importedPostos,
    )

    await client.query('COMMIT')

    return {
      message:
        parseResult.invalidRows > 0
          ? 'Importacao concluida com pendencias.'
          : 'Importacao concluida com sucesso.',
      importacaoId,
      importedPostos,
      status,
      ...parseResult,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
