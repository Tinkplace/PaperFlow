/*
  # Adicionar Data de Emissão às Bobinas

  1. Alterações
    - Adiciona coluna `data_emissao` à tabela `bobinas`
      - Armazena a data em que o CRT foi emitido/criado
      - Tipo: date (apenas data, sem hora)
      - Pode ser NULL para bobinas antigas

  2. Observações
    - A data de emissão representa quando o CRT foi criado/emitido
    - Bobinas do mesmo CRT devem ter a mesma data de emissão
    - Campo opcional para manter compatibilidade com registros existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'data_emissao'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN data_emissao date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bobinas_data_emissao ON bobinas(data_emissao);
CREATE INDEX IF NOT EXISTS idx_bobinas_numero_crt ON bobinas(numero_crt);