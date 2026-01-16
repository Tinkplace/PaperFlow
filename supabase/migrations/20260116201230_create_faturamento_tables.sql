/*
  # Create Faturamento Tables

  1. New Tables
    - `tabela_frete`
      - `id` (uuid, primary key)
      - `origem` (text)
      - `destino` (text)
      - `valor_frete_ton_usd` (numeric)
      - `valor_frete_kg_usd` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `frete_complementar_config`
      - `id` (uuid, primary key)
      - `frete_padrao_usd` (numeric, default 4392.99)
      - `updated_at` (timestamp)
    
    - `frete_veiculos`
      - `id` (uuid, primary key)
      - `romaneio_id` (uuid, foreign key to romaneios)
      - `placa_carreta` (text)
      - `numero_crt` (text)
      - `origem` (text)
      - `destino` (text)
      - `peso_kg` (numeric)
      - `valor_frete_usd` (numeric)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (as per existing pattern)
*/

CREATE TABLE IF NOT EXISTS tabela_frete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL,
  destino text NOT NULL,
  valor_frete_ton_usd numeric(10, 2) NOT NULL DEFAULT 0,
  valor_frete_kg_usd numeric(10, 4) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS frete_complementar_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frete_padrao_usd numeric(10, 2) NOT NULL DEFAULT 4392.99,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS frete_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  romaneio_id uuid REFERENCES romaneios(id) ON DELETE CASCADE,
  placa_carreta text NOT NULL,
  numero_crt text NOT NULL,
  origem text NOT NULL,
  destino text NOT NULL,
  peso_kg numeric(10, 2) NOT NULL DEFAULT 0,
  valor_frete_usd numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tabela_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE frete_complementar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE frete_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on tabela_frete"
  ON tabela_frete FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access on tabela_frete"
  ON tabela_frete FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access on tabela_frete"
  ON tabela_frete FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access on tabela_frete"
  ON tabela_frete FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access on frete_complementar_config"
  ON frete_complementar_config FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access on frete_complementar_config"
  ON frete_complementar_config FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access on frete_complementar_config"
  ON frete_complementar_config FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access on frete_veiculos"
  ON frete_veiculos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access on frete_veiculos"
  ON frete_veiculos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access on frete_veiculos"
  ON frete_veiculos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access on frete_veiculos"
  ON frete_veiculos FOR DELETE
  TO public
  USING (true);

INSERT INTO frete_complementar_config (frete_padrao_usd) VALUES (4392.99)
ON CONFLICT DO NOTHING;