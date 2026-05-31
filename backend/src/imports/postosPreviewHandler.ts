import { parsePostosCsv } from './postosCsv.js'

export function handlePostosPreview(req: any, res: any) {
  if (!req.file) {
    return res.status(400).json({
      message: 'Envie um arquivo CSV no campo "file".',
    })
  }

  const lowerName = req.file.originalname.toLowerCase()
  if (!lowerName.endsWith('.csv')) {
    return res.status(400).json({
      message: 'Apenas arquivos .csv sao aceitos.',
    })
  }

  try {
    const result = parsePostosCsv(req.file.buffer, req.file.originalname)

    return res.status(200).json({
      message: 'Arquivo processado com sucesso.',
      ...result,
    })
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Falha ao processar o arquivo CSV.',
    })
  }
}
