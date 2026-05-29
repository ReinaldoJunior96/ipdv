import express from 'express';
import cors from 'cors';

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    message: 'Backend funcionando com TypeScript',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});