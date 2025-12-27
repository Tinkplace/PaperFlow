/*
  # Adicionar Endereçamento às Bobinas

  1. Alterações
    - Adiciona colunas de endereçamento à tabela `bobinas`:
      - `rua` (text) - Rua onde a bobina está armazenada
      - `quadra` (text) - Quadra onde a bobina está armazenada
      - `linha` (text) - Linha onde a bobina está armazenada

  2. Observações
    - Bobinas do mesmo CRT podem ter endereços diferentes
    - Esses campos facilitam a localização das bobinas no momento de gerar o romaneio
    - Campos opcionais para manter compatibilidade com registros existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'rua'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN rua text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'quadra'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN quadra text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'linha'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN linha text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bobinas_rua ON bobinas(rua);
CREATE INDEX IF NOT EXISTS idx_bobinas_quadra ON bobinas(quadra);
CREATE INDEX IF NOT EXISTS idx_bobinas_linha ON bobinas(linha);