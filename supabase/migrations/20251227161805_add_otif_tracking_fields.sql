/*
  # Adicionar campos para tracking OTIF
  
  ## Alterações
  
  1. Campos adicionados à tabela `pedidos`:
    - `data_dip_processado` (timestamptz) - Data em que o DIP foi processado
    - `data_entrega` (timestamptz) - Data em que o pedido foi entregue (status = 'entregue')
  
  ## Objetivo
  
  Estes campos permitem calcular o indicador OTIF (On Time In Full):
  - On Time: entregue em até 10 dias da data do pedido ou da data do DIP processado
  
  ## Notas
  
  - Campos opcionais (nullable)
  - data_dip_processado será preenchida quando dip_processado = true
  - data_entrega será preenchida quando status_pedido = 'entregue'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'data_dip_processado'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN data_dip_processado timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'data_entrega'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN data_entrega timestamptz;
  END IF;
END $$;

-- Criar índices para melhorar performance das consultas OTIF
CREATE INDEX IF NOT EXISTS idx_pedidos_data_entrega 
  ON pedidos(data_entrega) 
  WHERE data_entrega IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_data_dip_processado 
  ON pedidos(data_dip_processado) 
  WHERE data_dip_processado IS NOT NULL;
