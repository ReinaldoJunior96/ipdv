import { importPostosCsv } from './postosImportService.js'

export async function handlePostosImport(req: any, res: any) {
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
    const result = await importPostosCsv(req.file.buffer, req.file.originalname)

    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Falha ao importar o arquivo CSV.',
    })
  }
}
