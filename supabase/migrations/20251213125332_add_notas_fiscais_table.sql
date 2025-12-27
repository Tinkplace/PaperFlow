/*
  # Add Notas Fiscais Table

  1. New Tables
    - `notas_fiscais`
      - `id` (uuid, primary key)
      - `numero_crt` (text) - CRT number this invoice belongs to
      - `numero_nota_fiscal` (text, unique) - Invoice number
      - `valor_nota_fiscal` (numeric) - Invoice value
      - `created_at` (timestamp)
  
  2. Changes
    - Add `nota_fiscal_id` to `bobinas` table to link bobinas to invoices
    - Add foreign key constraint from bobinas to notas_fiscais

  3. Security
    - Enable RLS on `notas_fiscais` table
    - Add policies for public access (matching existing pattern)

  4. Important Notes
    - A CRT can have up to 50 invoices
    - Each invoice can have up to 300 bobinas
    - This provides better organization for merchandise entry
*/

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_crt text,
  numero_nota_fiscal text UNIQUE NOT NULL,
  valor_nota_fiscal numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to notas_fiscais"
  ON notas_fiscais
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to notas_fiscais"
  ON notas_fiscais
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to notas_fiscais"
  ON notas_fiscais
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to notas_fiscais"
  ON notas_fiscais
  FOR DELETE
  TO public
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bobinas' AND column_name = 'nota_fiscal_id'
  ) THEN
    ALTER TABLE bobinas ADD COLUMN nota_fiscal_id uuid REFERENCES notas_fiscais(id) ON DELETE SET NULL;
  END IF;
END $$;