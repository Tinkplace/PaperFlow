/*
  # Add Order Cancellation Support

  1. Changes
    - Add `cancelado` boolean column to track cancelled orders
    - Add `justificativa_cancelamento` text column to store cancellation reason
    - Add `data_cancelamento` timestamp column to track when order was cancelled
  
  2. Notes
    - Cancelled orders will have destino set to null to return them to the Pedidos tab
    - Default value for cancelado is false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'cancelado'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN cancelado boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'justificativa_cancelamento'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN justificativa_cancelamento text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'data_cancelamento'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN data_cancelamento timestamptz;
  END IF;
END $$;