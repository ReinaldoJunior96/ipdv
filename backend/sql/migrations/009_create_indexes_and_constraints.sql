CREATE INDEX IF NOT EXISTS idx_importacoes_status
  ON importacoes(status);

CREATE INDEX IF NOT EXISTS idx_staging_postos_importacao_id
  ON staging_postos(importacao_id);

CREATE INDEX IF NOT EXISTS idx_staging_postos_valido
  ON staging_postos(valido);

CREATE INDEX IF NOT EXISTS idx_postos_status
  ON postos(status);

CREATE INDEX IF NOT EXISTS idx_postos_municipio_uf
  ON postos(municipio, uf);

CREATE INDEX IF NOT EXISTS idx_postos_bandeira_id
  ON postos(bandeira_id);

CREATE INDEX IF NOT EXISTS idx_postos_responsavel_id
  ON postos(responsavel_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_staging_postos_linha_origem_positive'
  ) THEN
    ALTER TABLE staging_postos
      ADD CONSTRAINT chk_staging_postos_linha_origem_positive
      CHECK (linha_origem > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_responsaveis_cpf_length'
  ) THEN
    ALTER TABLE responsaveis
      ADD CONSTRAINT chk_responsaveis_cpf_length
      CHECK (char_length(cpf) = 11);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_postos_cnpj_length'
  ) THEN
    ALTER TABLE postos
      ADD CONSTRAINT chk_postos_cnpj_length
      CHECK (char_length(cnpj) = 14);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_postos_uf_length'
  ) THEN
    ALTER TABLE postos
      ADD CONSTRAINT chk_postos_uf_length
      CHECK (char_length(uf) = 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_postos_cep_length'
  ) THEN
    ALTER TABLE postos
      ADD CONSTRAINT chk_postos_cep_length
      CHECK (char_length(cep) = 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_postos_numero_bicos_non_negative'
  ) THEN
    ALTER TABLE postos
      ADD CONSTRAINT chk_postos_numero_bicos_non_negative
      CHECK (numero_bicos IS NULL OR numero_bicos >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_postos_numero_pistas_non_negative'
  ) THEN
    ALTER TABLE postos
      ADD CONSTRAINT chk_postos_numero_pistas_non_negative
      CHECK (numero_pistas IS NULL OR numero_pistas >= 0);
  END IF;
END $$;
