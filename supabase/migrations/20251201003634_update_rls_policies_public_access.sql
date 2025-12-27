/*
  # Atualizar políticas RLS para permitir acesso público
  
  Alterando as políticas RLS para permitir acesso anônimo ao sistema de inventário.
  Isso permite que o aplicativo funcione sem autenticação obrigatória.
  
  ## Mudanças
  - Modificar políticas de SELECT para permitir role 'anon'
  - Modificar políticas de INSERT/UPDATE/DELETE para permitir role 'anon'
*/

-- Políticas RLS para bobinas (permitir público)
DROP POLICY IF EXISTS "Allow authenticated users to select bobinas" ON bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to insert bobinas" ON bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to update bobinas" ON bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to delete bobinas" ON bobinas;

CREATE POLICY "Allow public access to select bobinas"
  ON bobinas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to insert bobinas"
  ON bobinas FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to update bobinas"
  ON bobinas FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to delete bobinas"
  ON bobinas FOR DELETE
  TO public
  USING (true);

-- Políticas RLS para pedidos (permitir público)
DROP POLICY IF EXISTS "Allow authenticated users to select pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow authenticated users to insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow authenticated users to update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow authenticated users to delete pedidos" ON pedidos;

CREATE POLICY "Allow public access to select pedidos"
  ON pedidos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to insert pedidos"
  ON pedidos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to update pedidos"
  ON pedidos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to delete pedidos"
  ON pedidos FOR DELETE
  TO public
  USING (true);

-- Políticas RLS para pedidos_bobinas (permitir público)
DROP POLICY IF EXISTS "Allow authenticated users to select pedidos_bobinas" ON pedidos_bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to insert pedidos_bobinas" ON pedidos_bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to delete pedidos_bobinas" ON pedidos_bobinas;

CREATE POLICY "Allow public access to select pedidos_bobinas"
  ON pedidos_bobinas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to insert pedidos_bobinas"
  ON pedidos_bobinas FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to delete pedidos_bobinas"
  ON pedidos_bobinas FOR DELETE
  TO public
  USING (true);

-- Políticas RLS para romaneios (permitir público)
DROP POLICY IF EXISTS "Allow authenticated users to select romaneios" ON romaneios;
DROP POLICY IF EXISTS "Allow authenticated users to insert romaneios" ON romaneios;
DROP POLICY IF EXISTS "Allow authenticated users to update romaneios" ON romaneios;
DROP POLICY IF EXISTS "Allow authenticated users to delete romaneios" ON romaneios;

CREATE POLICY "Allow public access to select romaneios"
  ON romaneios FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to insert romaneios"
  ON romaneios FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to update romaneios"
  ON romaneios FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to delete romaneios"
  ON romaneios FOR DELETE
  TO public
  USING (true);

-- Políticas RLS para romaneios_bobinas (permitir público)
DROP POLICY IF EXISTS "Allow authenticated users to select romaneios_bobinas" ON romaneios_bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to insert romaneios_bobinas" ON romaneios_bobinas;
DROP POLICY IF EXISTS "Allow authenticated users to delete romaneios_bobinas" ON romaneios_bobinas;

CREATE POLICY "Allow public access to select romaneios_bobinas"
  ON romaneios_bobinas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to insert romaneios_bobinas"
  ON romaneios_bobinas FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to delete romaneios_bobinas"
  ON romaneios_bobinas FOR DELETE
  TO public
  USING (true);