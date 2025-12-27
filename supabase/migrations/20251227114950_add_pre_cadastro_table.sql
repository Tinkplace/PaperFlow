/*
  # Create Pré-Cadastro Table

  1. New Tables
    - `pre_cadastro`
      - `id` (uuid, primary key) - Unique identifier
      - `numero_crt` (text) - CRT number
      - `ov` (text) - Ordem de Venda (Sales Order)
      - `oc` (text) - Ordem de Compra (Purchase Order)
      - `exportador` (text) - Exporter name
      - `importador` (text) - Importer name
      - `origem` (text) - Origin
      - `data_emissao_crt` (date) - CRT emission date
      - `volumes_programados_qtd` (integer) - Programmed quantity of coils
      - `volumes_programados_kg` (numeric) - Total weight in Kg
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `pre_cadastro` table
    - Add policy for public read access
    - Add policy for public insert access
    - Add policy for public update access
    - Add policy for public delete access
*/

CREATE TABLE IF NOT EXISTS pre_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_crt text NOT NULL UNIQUE,
  ov text DEFAULT '',
  oc text DEFAULT '',
  exportador text DEFAULT '',
  importador text DEFAULT '',
  origem text DEFAULT '',
  data_emissao_crt date,
  volumes_programados_qtd integer DEFAULT 0,
  volumes_programados_kg numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pre_cadastro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to pre_cadastro"
  ON pre_cadastro
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to pre_cadastro"
  ON pre_cadastro
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to pre_cadastro"
  ON pre_cadastro
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to pre_cadastro"
  ON pre_cadastro
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create index on numero_crt for faster lookups
CREATE INDEX IF NOT EXISTS idx_pre_cadastro_numero_crt ON pre_cadastro(numero_crt);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pre_cadastro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pre_cadastro_updated_at
  BEFORE UPDATE ON pre_cadastro
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_cadastro_updated_at();