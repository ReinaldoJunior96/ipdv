CREATE TABLE IF NOT EXISTS importacoes (
  id BIGSERIAL PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'processando',
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_validas INTEGER NOT NULL DEFAULT 0,
  total_invalidas INTEGER NOT NULL DEFAULT 0,
  mensagem TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);
