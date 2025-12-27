/*
  # Add unique constraint for numero_crt with carga_completa

  1. Changes
    - Remove any duplicate records before adding constraint
    - Add unique constraint to ensure only one pedido per numero_crt with carga_completa = true
    
  2. Notes
    - This prevents duplicate CRTs from appearing in the timeline
    - If duplicates exist, only the first one (by created_at) is kept
*/

-- First, remove duplicate pedidos keeping only the oldest one for each numero_crt where carga_completa = true
DELETE FROM pedidos
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY numero_crt ORDER BY created_at ASC) AS rn
    FROM pedidos
    WHERE carga_completa = true
  ) t
  WHERE rn > 1
);

-- Create a unique partial index to prevent duplicate numero_crt where carga_completa = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numero_crt_carga_completa 
ON pedidos (numero_crt) 
WHERE carga_completa = true;
