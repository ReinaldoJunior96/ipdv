import { pipeline } from 'node:stream/promises'
import { to as copyTo } from 'pg-copy-streams'
import { pool } from '../db/pool.js'

const exportQuery = `
  COPY (
    SELECT
      p.cnpj,
      p.nome_posto,
      COALESCE(p.nome_fantasia, '') AS nome_fantasia,
      COALESCE(b.nome, '') AS bandeira,
      p.logradouro,
      COALESCE(p.numero, '') AS numero,
      COALESCE(p.complemento, '') AS complemento,
      p.bairro,
      p.municipio,
      p.uf,
      p.cep,
      r.cpf AS cpf_responsavel,
      r.nome AS nome_responsavel,
      COALESCE(r.email, '') AS email_responsavel,
      COALESCE(r.cargo, '') AS cargo_responsavel,
      COALESCE(
        STRING_AGG(DISTINCT c.nome, ',' ORDER BY c.nome),
        ''
      ) AS combustiveis,
      p.status,
      COALESCE(TO_CHAR(p.data_inauguracao, 'DD/MM/YYYY'), '') AS data_inauguracao,
      COALESCE(p.numero_bicos::TEXT, '') AS numero_bicos,
      COALESCE(p.numero_pistas::TEXT, '') AS numero_pistas,
      COALESCE(p.observacoes, '') AS observacoes
    FROM postos p
    LEFT JOIN bandeiras b ON b.id = p.bandeira_id
    LEFT JOIN responsaveis r ON r.id = p.responsavel_id
    LEFT JOIN posto_combustiveis pc ON pc.posto_id = p.id
    LEFT JOIN combustiveis c ON c.id = pc.combustivel_id
    GROUP BY
      p.id,
      b.nome,
      r.cpf,
      r.nome,
      r.email,
      r.cargo
    ORDER BY p.id
  ) TO STDOUT WITH (FORMAT CSV, HEADER TRUE, DELIMITER ';', ENCODING 'UTF8')
`

function createExportFileName() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `postos-${year}${month}${day}.csv`
}

export async function handleExportPostos(_req: any, res: any) {
  const client = await pool.connect()

  try {
    const stream = client.query(copyTo(exportQuery))

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${createExportFileName()}"`)

    await pipeline(stream, res)
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao exportar os postos cadastrados.',
      })
    } else {
      res.destroy(error instanceof Error ? error : undefined)
    }
  } finally {
    client.release()
  }
}
