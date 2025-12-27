/*
  # Add DIP processing field to pedidos table

  1. New Columns
    - `dip_processado` (boolean, default false) - Tracks if DIP has been processed for the order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'dip_processado'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN dip_processado boolean DEFAULT false;
  END IF;
END $$;
