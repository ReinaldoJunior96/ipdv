import { pool } from '../db/pool.js'

export async function handleClearPostos(_req: any, res: any) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(`
      TRUNCATE TABLE
        posto_combustiveis,
        staging_postos,
        importacoes,
        postos,
        combustiveis,
        responsaveis,
        bandeiras
      RESTART IDENTITY CASCADE
    `)
    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Dados cadastrados limpos com sucesso.',
    })
  } catch (error) {
    await client.query('ROLLBACK')

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : 'Falha ao limpar os dados cadastrados.',
    })
  } finally {
    client.release()
  }
}
