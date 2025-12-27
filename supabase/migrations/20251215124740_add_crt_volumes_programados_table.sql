/*
  # Add CRT Programmed Volumes Table

  1. New Tables
    - `crt_volumes_programados`
      - `id` (uuid, primary key)
      - `numero_crt` (text, unique) - CRT number
      - `bobinas_programadas` (integer) - Programmed number of coils/volumes
      - `peso_programado_kg` (numeric) - Programmed total weight in kg
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `crt_volumes_programados` table
    - Add policies for public access (read and write)
  
  3. Notes
    - This table stores the manually editable programmed volumes for each CRT
    - Used for inventory accounting and calculating transit balance
    - Transit balance = Programmed volumes - Stored volumes
*/

CREATE TABLE IF NOT EXISTS crt_volumes_programados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_crt text UNIQUE NOT NULL,
  bobinas_programadas integer DEFAULT 0,
  peso_programado_kg numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crt_volumes_programados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to crt_volumes_programados"
  ON crt_volumes_programados
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to crt_volumes_programados"
  ON crt_volumes_programados
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to crt_volumes_programados"
  ON crt_volumes_programados
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to crt_volumes_programados"
  ON crt_volumes_programados
  FOR DELETE
  TO public
  USING (true);