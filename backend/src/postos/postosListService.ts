import { pool } from '../db/pool.js'

export async function listPostos() {
  const { rows } = await pool.query(
    `
      SELECT
        p.id,
        p.cnpj,
        p.nome_posto,
        p.nome_fantasia,
        b.nome AS bandeira,
        p.logradouro,
        p.numero,
        p.complemento,
        p.bairro,
        p.municipio,
        p.uf,
        p.cep,
        r.cpf AS cpf_responsavel,
        r.nome AS nome_responsavel,
        r.email AS email_responsavel,
        r.cargo AS cargo_responsavel,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.nome ORDER BY c.nome), NULL),
          ARRAY[]::VARCHAR[]
        ) AS combustiveis,
        p.status,
        p.data_inauguracao,
        p.numero_bicos,
        p.numero_pistas,
        p.observacoes
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
      ORDER BY p.id DESC
    `,
  )

  return rows
}
