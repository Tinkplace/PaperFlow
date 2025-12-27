/*
  # Adicionar Suporte para Múltiplos Destinos em Pedidos

  ## Visão Geral
  Permite que um pedido (CRT) tenha até 4 destinos diferentes.
  
  ## 1. Nova Tabela
  
  ### `pedidos_destinos`
  Tabela de destinos de cada pedido
  - `id` (uuid, primary key) - Identificador único
  - `pedido_id` (uuid, foreign key) - Referência ao pedido
  - `destino` (text) - Nome da cidade de destino
  - `ordem` (integer) - Ordem do destino (1, 2, 3, ou 4)
  - `created_at` (timestamptz) - Data de criação
  
  ## 2. Migração de Dados
  - Migra destinos existentes da coluna `destino` para a nova tabela
  - Mantém a coluna `destino` por compatibilidade (será removida em migração futura)
  
  ## 3. Segurança
  - RLS habilitado na nova tabela
  - Políticas permitem acesso para operações CRUD
  
  ## 4. Índices
  - Índice criado para melhorar performance de buscas por pedido_id
  - Índice único para garantir que não há destinos duplicados na mesma ordem
*/

-- Criar tabela de destinos
CREATE TABLE IF NOT EXISTS pedidos_destinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid REFERENCES pedidos(id) ON DELETE CASCADE NOT NULL,
  destino text NOT NULL,
  ordem integer NOT NULL CHECK (ordem >= 1 AND ordem <= 4),
  created_at timestamptz DEFAULT now()
);

-- Adicionar constraint para evitar destinos duplicados na mesma ordem para o mesmo pedido
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_destinos_unique 
  ON pedidos_destinos(pedido_id, ordem);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pedidos_destinos_pedido 
  ON pedidos_destinos(pedido_id);

-- Migrar dados existentes da coluna destino para a nova tabela
DO $$
BEGIN
  -- Inserir destinos existentes como primeiro destino (ordem 1)
  INSERT INTO pedidos_destinos (pedido_id, destino, ordem)
  SELECT id, destino, 1
  FROM pedidos
  WHERE destino IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM pedidos_destinos pd 
      WHERE pd.pedido_id = pedidos.id
    );
END $$;

-- Habilitar Row Level Security
ALTER TABLE pedidos_destinos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Allow public to select pedidos_destinos"
  ON pedidos_destinos FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert pedidos_destinos"
  ON pedidos_destinos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update pedidos_destinos"
  ON pedidos_destinos FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete pedidos_destinos"
  ON pedidos_destinos FOR DELETE
  USING (true);