-- Tabela de cache de tribunais (PostgreSQL)
-- Armazena informações dos tribunais obtidas do webservice corporativo-proxy
CREATE TABLE ia_court (
  id INT NOT NULL PRIMARY KEY,                -- court_id (seq_orgao do webservice)
  sigla VARCHAR(32) NOT NULL,                 -- Ex: "TRF2", "JFRJ", "STF"
  nome VARCHAR(256) NOT NULL,                 -- Nome completo do tribunal
  tipo VARCHAR(64) NULL,                      -- Tipo do órgão (tribunal, vara, etc.)
  seq_tribunal_pai INT NULL,                  -- ID do tribunal pai (para varas/seções)
  uf VARCHAR(2) NULL,                         -- UF do tribunal
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ia_court_sigla ON ia_court (sigla);
CREATE INDEX idx_ia_court_tribunal_pai ON ia_court (seq_tribunal_pai);
