/*
  # Adicionar data e hora de saída aos romaneios

  1. Alterações
    - Adiciona coluna `data_hora_saida` à tabela `romaneios`
    - Tipo: timestamptz (timestamp com timezone)
    - Permite NULL, pois nem todos os romaneios terão saída registrada imediatamente
    
  2. Propósito
    - Registrar o momento exato da saída do caminhão
    - Controlar quando as bobinas devem mudar de status para "carregado"
    - Apenas romaneios com data_hora_saida registrada devem atualizar o status das bobinas
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'romaneios' AND column_name = 'data_hora_saida'
  ) THEN
    ALTER TABLE romaneios ADD COLUMN data_hora_saida timestamptz;
  END IF;
END $$;