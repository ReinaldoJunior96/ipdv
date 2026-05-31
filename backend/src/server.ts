import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parsePostosCsv } from './imports/postosCsv.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req: any, res: any) => {
  return res.json({
    status: 'ok',
    message: 'Backend funcionando com TypeScript',
  });
});

app.post('/importacoes/postos/preview', upload.single('file'), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'Envie um arquivo CSV no campo "file".',
    });
  }

  const lowerName = req.file.originalname.toLowerCase();
  if (!lowerName.endsWith('.csv')) {
    return res.status(400).json({
      message: 'Apenas arquivos .csv sao aceitos.',
    });
  }

  try {
    const result = parsePostosCsv(req.file.buffer, req.file.originalname);

    return res.status(200).json({
      message: 'Arquivo processado com sucesso.',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Falha ao processar o arquivo CSV.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
