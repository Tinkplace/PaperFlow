/*
  # Add CRT Complementar and Data Entrega Remito to Frete Veículos

  1. Changes
    - Add `crt_complementar` column to `frete_veiculos` table
      - Type: text (nullable)
      - Used for manual entry of complementary CRT number
    
    - Add `data_entrega_remito` column to `frete_veiculos` table
      - Type: date (nullable)
      - Used for manual entry of delivery date from remito
  
  2. Security
    - No RLS changes needed (existing policies cover all columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'frete_veiculos' AND column_name = 'crt_complementar'
  ) THEN
    ALTER TABLE frete_veiculos ADD COLUMN crt_complementar text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'frete_veiculos' AND column_name = 'data_entrega_remito'
  ) THEN
    ALTER TABLE frete_veiculos ADD COLUMN data_entrega_remito date;
  END IF;
END $$;