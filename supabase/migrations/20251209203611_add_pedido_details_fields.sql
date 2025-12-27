/*
  # Adicionar campos detalhados para pedidos

  ## Alterações
  
  1. Campos adicionados à tabela `pedidos`:
    - `numero_oc` (text) - Ordem de Compra
    - `numero_proforma` (text) - Número da Proforma
    - `tipo_papel` (text) - Tipo de papel
    - `gramatura` (integer) - Gramatura do papel
    - `formato_mm` (integer) - Formato em milímetros
    - `quantidade_bobinas` (integer) - Quantidade total de bobinas
    - `peso_total_kg` (numeric) - Peso total em quilogramas
    - `destino` (text) - Destino da carga
    - `prioridade` (integer) - Prioridade do pedido (1-100)
    - `status_pedido` (text) - Status específico do pedido (recebido, aguardando_dip, separacao, preparacao, enviado, rota, entregue)
  
  ## Notas Importantes
  - Campos opcionais permitem pedidos parcialmente preenchidos
  - Status do pedido agora separado do status de processamento
  - Destino com CHECK constraint para validar opções
*/

-- Adicionar campos detalhados à tabela pedidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'numero_oc'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN numero_oc text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'numero_proforma'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN numero_proforma text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'tipo_papel'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN tipo_papel text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'gramatura'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN gramatura integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'formato_mm'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN formato_mm integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'quantidade_bobinas'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN quantidade_bobinas integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'peso_total_kg'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN peso_total_kg numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'destino'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN destino text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'prioridade'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN prioridade integer DEFAULT 50 CHECK (prioridade >= 1 AND prioridade <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'status_pedido'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN status_pedido text DEFAULT 'recebido' 
      CHECK (status_pedido IN ('recebido', 'aguardando_dip', 'separacao', 'preparacao', 'enviado', 'rota', 'entregue'));
  END IF;
END $$;

-- Adicionar constraint para destino (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pedidos_destino_check'
  ) THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_destino_check 
      CHECK (destino IN ('Parana', 'Lujan', 'Arroyito', 'Quilmes', 'San Juan', 'Cordoba', 'Pilar', 'Buenos Aires', 'Santa Fé', 'Rosário', 'Mendoza', 'Santiago'));
  END IF;
END $$;