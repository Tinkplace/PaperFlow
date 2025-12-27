/*
  # Adicionar campos de fatura e CRT aos pedidos
  
  1. Novas Colunas em `pedidos`
    - `numero_fatura` (text, opcional) - Número da fatura associada ao pedido
    - `numero_crt` (text, opcional) - Número do CRT (Comprovante de Registro de Trânsito)
  
  2. Segurança
    - Nenhuma alteração de RLS necessária
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'numero_fatura'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN numero_fatura text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'numero_crt'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN numero_crt text;
  END IF;
END $$;