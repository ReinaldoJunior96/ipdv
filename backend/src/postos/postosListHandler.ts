import { listPostos } from './postosListService.js'

export async function handleListPostos(_req: any, res: any) {
  try {
    const postos = await listPostos()

    return res.status(200).json({
      message: 'Postos carregados com sucesso.',
      total: postos.length,
      rows: postos,
    })
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : 'Falha ao carregar os postos cadastrados.',
    })
  }
}
