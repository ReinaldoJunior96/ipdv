import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { handlePostosImport } from './imports/postosImportHandler.js'
import { handlePostosPreview } from './imports/postosPreviewHandler.js'
import { handleExportPostos } from './postos/postosExportHandler.js'
import { handleClearPostos } from './postos/postosClearHandler.js'
import { handleListPostos } from './postos/postosListHandler.js'

export function createApp() {
  const app = express()
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  })

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req: any, res: any) => {
    return res.json({
      status: 'ok',
      message: 'Backend funcionando com TypeScript',
    })
  })

  app.get('/postos', (req: any, res: any) => {
    return handleListPostos(req, res)
  })

  app.get('/postos/exportar', async (req: any, res: any) => {
    return handleExportPostos(req, res)
  })

  app.delete('/postos', async (req: any, res: any) => {
    return handleClearPostos(req, res)
  })

  app.post('/importacoes/postos/preview', upload.single('file'), (req: any, res: any) => {
    return handlePostosPreview(req, res)
  })

  app.post('/importacoes/postos', upload.single('file'), async (req: any, res: any) => {
    return handlePostosImport(req, res)
  })

  return app
}
