import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { handlePostosPreview } from './imports/postosPreviewHandler.js'

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

  app.post('/importacoes/postos/preview', upload.single('file'), (req: any, res: any) => {
    return handlePostosPreview(req, res)
  })

  return app
}
