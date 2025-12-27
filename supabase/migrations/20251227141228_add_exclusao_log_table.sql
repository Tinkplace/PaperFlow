/*
  # Adiciona tabela de log de exclusões de CRT

  1. Nova Tabela
    - `exclusao_log`
      - `id` (uuid, primary key)
      - `numero_crt` (text) - Número do CRT excluído
      - `justificativa` (text) - Justificativa para exclusão
      - `bobinas_excluidas` (integer) - Quantidade de bobinas excluídas
      - `notas_fiscais_excluidas` (integer) - Quantidade de notas fiscais excluídas
      - `total_registros_excluidos` (integer) - Total de registros excluídos
      - `created_at` (timestamptz) - Data e hora da exclusão
  
  2. Segurança
    - Habilita RLS na tabela `exclusao_log`
    - Adiciona política para permitir inserção autenticada
    - Adiciona política para permitir leitura autenticada
*/

CREATE TABLE IF NOT EXISTS exclusao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_crt text NOT NULL,
  justificativa text NOT NULL,
  bobinas_excluidas integer DEFAULT 0,
  notas_fiscais_excluidas integer DEFAULT 0,
  total_registros_excluidos integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exclusao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de logs de exclusão"
  ON exclusao_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de logs de exclusão"
  ON exclusao_log FOR INSERT
  TO authenticated
  WITH CHECK (true);