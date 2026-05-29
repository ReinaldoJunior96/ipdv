CREATE TABLE IF NOT EXISTS posto_combustiveis (
  posto_id BIGINT NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
  combustivel_id BIGINT NOT NULL REFERENCES combustiveis(id) ON DELETE CASCADE,
  PRIMARY KEY (posto_id, combustivel_id)
);
