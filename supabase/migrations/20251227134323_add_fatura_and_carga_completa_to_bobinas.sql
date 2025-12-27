/*
  # Adicionar campos de fatura e carga completa às bobinas

  ## Alterações
  
  1. Adicionar coluna numero_fatura à tabela bobinas:
    - `numero_fatura` (text, opcional)
    - Armazena o número da fatura associada à bobina
  
  2. Adicionar coluna carga_completa à tabela bobinas:
    - `carga_completa` (boolean, default false)
    - Indica se a carga do CRT foi marcada como completa
  
  ## Notas Importantes
  - Permite gerenciar fatura e status de carga completa no estoque
  - Por padrão, novas bobinas terão carga_completa = false
  - Bobinas existentes também receberão o valor false
*/

-- Adicionar coluna numero_fatura à tabela bobinas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'numero_fatura'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN numero_fatura text;
  END IF;
END $$;

-- Adicionar coluna carga_completa à tabela bobinas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'carga_completa'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN carga_completa boolean DEFAULT false NOT NULL;
  END IF;
END $$;
