/*
  # Adicionar campo carga_completa aos pedidos

  ## Alterações
  
  1. Adicionar coluna carga_completa à tabela pedidos:
    - `carga_completa` (boolean, default false)
    - Indica se a carga do pedido foi marcada como completa
  
  ## Notas Importantes
  - O campo é obrigatório para permitir a geração do pedido
  - Por padrão, novos pedidos terão carga_completa = false
  - Pedidos existentes também receberão o valor false
*/

-- Adicionar coluna carga_completa à tabela pedidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'carga_completa'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN carga_completa boolean DEFAULT false NOT NULL;
  END IF;
END $$;