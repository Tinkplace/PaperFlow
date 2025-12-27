/*
  # Sistema de Controle de Estoque de Bobinas de Papel
  
  ## Visão Geral
  Sistema completo para gerenciar entrada, estoque e saída de bobinas de papel com rastreamento
  de documentos comerciais (CRT, OC, Proforma, OV) e informações detalhadas de transporte.
  
  ## 1. Novas Tabelas
  
  ### `bobinas`
  Tabela principal contendo todas as bobinas no sistema
  - `id` (uuid, primary key) - Identificador único
  - `numero_bobina` (text) - Número identificador da bobina
  - `numero_crt` (text) - Conhecimento de Transporte Rodoviário
  - `numero_oc` (text) - Ordem de Compra
  - `numero_proforma` (text) - Fatura Comercial
  - `numero_ov` (text) - Ordem de Venda
  - `tipo_papel` (text) - Tipo (Kraftliner, Eukaliner, etc)
  - `gramatura` (integer) - Gramatura em g/m² (125, 140, 150, etc)
  - `formato_mm` (integer) - Formato em milímetros (2100, 2450, 2370)
  - `peso_kg` (numeric) - Peso da bobina em quilogramas
  - `exportador` (text) - Nome do exportador
  - `importador` (text) - Nome do importador
  - `numero_nota_fiscal` (text) - Número da NF
  - `valor_nota_fiscal` (numeric) - Valor da NF
  - `origem` (text) - Local de origem
  - `status` (text) - Status: 'em_transito', 'em_estoque', 'carregado'
  - `data_entrada` (timestamptz) - Data/hora de entrada no armazém
  - `data_descarga` (timestamptz) - Data/hora da descarga
  - `placa_cavalo` (text) - Placa do cavalo mecânico
  - `placa_carreta` (text) - Placa da carreta
  - `nome_motorista` (text) - Nome do motorista
  - `created_at` (timestamptz) - Data de criação do registro
  
  ### `pedidos`
  Pedidos gerados para carregamento
  - `id` (uuid, primary key)
  - `numero_ov` (text) - Ordem de Venda relacionada
  - `data_pedido` (timestamptz) - Data/hora do pedido
  - `status` (text) - Status: 'pendente', 'processando', 'concluido'
  - `created_at` (timestamptz)
  
  ### `pedidos_bobinas`
  Relação entre pedidos e bobinas selecionadas
  - `id` (uuid, primary key)
  - `pedido_id` (uuid, foreign key) - Referência ao pedido
  - `bobina_id` (uuid, foreign key) - Referência à bobina
  - `created_at` (timestamptz)
  
  ### `romaneios`
  Romaneios de carregamento para transporte
  - `id` (uuid, primary key)
  - `numero_romaneio` (text) - Número único do romaneio
  - `data_carregamento` (timestamptz) - Data/hora do carregamento
  - `nome_motorista` (text) - Nome do motorista
  - `placa_carreta` (text) - Placa da carreta
  - `numero_crt` (text) - CRT do transporte
  - `numero_fatura` (text) - Número da fatura
  - `destino` (text) - Destino da carga
  - `pedido_id` (uuid, foreign key) - Pedido relacionado
  - `created_at` (timestamptz)
  
  ### `romaneios_bobinas`
  Bobinas incluídas em cada romaneio
  - `id` (uuid, primary key)
  - `romaneio_id` (uuid, foreign key)
  - `bobina_id` (uuid, foreign key)
  - `created_at` (timestamptz)
  
  ## 2. Segurança
  - RLS habilitado em todas as tabelas
  - Políticas permitem acesso autenticado para operações CRUD
  
  ## 3. Índices
  - Índices criados para melhorar performance de buscas por:
    - Número de OV (ordem de venda)
    - Status das bobinas
    - Número do romaneio
    - Datas de entrada e carregamento
  
  ## 4. Observações Importantes
  - Sistema permite múltiplas bobinas com OVs diferentes no mesmo caminhão
  - Rastreamento completo desde entrada até carregamento
  - Status automático para controle de estoque em tempo real
*/

-- Tabela principal de bobinas
CREATE TABLE IF NOT EXISTS bobinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_bobina text NOT NULL,
  numero_crt text,
  numero_oc text,
  numero_proforma text,
  numero_ov text,
  tipo_papel text NOT NULL,
  gramatura integer NOT NULL,
  formato_mm integer NOT NULL,
  peso_kg numeric(10, 2) NOT NULL,
  exportador text,
  importador text,
  numero_nota_fiscal text,
  valor_nota_fiscal numeric(15, 2),
  origem text,
  status text DEFAULT 'em_transito' CHECK (status IN ('em_transito', 'em_estoque', 'carregado')),
  data_entrada timestamptz,
  data_descarga timestamptz,
  placa_cavalo text,
  placa_carreta text,
  nome_motorista text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ov text NOT NULL,
  data_pedido timestamptz DEFAULT now(),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido')),
  created_at timestamptz DEFAULT now()
);

-- Tabela de relação pedidos-bobinas
CREATE TABLE IF NOT EXISTS pedidos_bobinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  bobina_id uuid REFERENCES bobinas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Tabela de romaneios
CREATE TABLE IF NOT EXISTS romaneios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_romaneio text UNIQUE NOT NULL,
  data_carregamento timestamptz NOT NULL,
  nome_motorista text NOT NULL,
  placa_carreta text NOT NULL,
  numero_crt text,
  numero_fatura text,
  destino text NOT NULL CHECK (destino IN ('Lujan', 'Parana', 'Quilmes', 'Arroyito', 'San Juan', 'Medlog', 'Cordoba', 'zarati', 'Sarandi', 'Santiago')),
  pedido_id uuid REFERENCES pedidos(id),
  created_at timestamptz DEFAULT now()
);

-- Tabela de relação romaneios-bobinas
CREATE TABLE IF NOT EXISTS romaneios_bobinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  romaneio_id uuid REFERENCES romaneios(id) ON DELETE CASCADE,
  bobina_id uuid REFERENCES bobinas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_bobinas_numero_ov ON bobinas(numero_ov);
CREATE INDEX IF NOT EXISTS idx_bobinas_status ON bobinas(status);
CREATE INDEX IF NOT EXISTS idx_bobinas_data_entrada ON bobinas(data_entrada);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_ov ON pedidos(numero_ov);
CREATE INDEX IF NOT EXISTS idx_romaneios_numero ON romaneios(numero_romaneio);
CREATE INDEX IF NOT EXISTS idx_romaneios_data ON romaneios(data_carregamento);

-- Habilitar Row Level Security
ALTER TABLE bobinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_bobinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE romaneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE romaneios_bobinas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bobinas
CREATE POLICY "Allow authenticated users to select bobinas"
  ON bobinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert bobinas"
  ON bobinas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bobinas"
  ON bobinas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete bobinas"
  ON bobinas FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para pedidos
CREATE POLICY "Allow authenticated users to select pedidos"
  ON pedidos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pedidos"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pedidos"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete pedidos"
  ON pedidos FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para pedidos_bobinas
CREATE POLICY "Allow authenticated users to select pedidos_bobinas"
  ON pedidos_bobinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pedidos_bobinas"
  ON pedidos_bobinas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete pedidos_bobinas"
  ON pedidos_bobinas FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para romaneios
CREATE POLICY "Allow authenticated users to select romaneios"
  ON romaneios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert romaneios"
  ON romaneios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update romaneios"
  ON romaneios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete romaneios"
  ON romaneios FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para romaneios_bobinas
CREATE POLICY "Allow authenticated users to select romaneios_bobinas"
  ON romaneios_bobinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert romaneios_bobinas"
  ON romaneios_bobinas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete romaneios_bobinas"
  ON romaneios_bobinas FOR DELETE
  TO authenticated
  USING (true);