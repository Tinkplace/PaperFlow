/*
  # Consolidar Colunas Fatura para Proforma

  1. Alterações na tabela `pedidos`
    - Copia dados de `numero_fatura` para `numero_proforma` quando `numero_proforma` está vazio
    - Remove coluna `numero_fatura` (redundante, já existe `numero_proforma`)

  2. Alterações na tabela `romaneios`
    - Renomeia coluna `numero_fatura` para `numero_proforma`

  3. Observações
    - Fatura e Proforma são a mesma coisa no contexto do sistema
    - Padroniza nomenclatura para usar sempre "proforma"
*/

-- Atualizar pedidos: copiar dados de numero_fatura para numero_proforma quando necessário
UPDATE pedidos 
SET numero_proforma = numero_fatura 
WHERE numero_fatura IS NOT NULL 
  AND (numero_proforma IS NULL OR numero_proforma = '');

-- Remover coluna numero_fatura da tabela pedidos
ALTER TABLE pedidos DROP COLUMN IF EXISTS numero_fatura;

-- Renomear coluna na tabela romaneios
ALTER TABLE romaneios RENAME COLUMN numero_fatura TO numero_proforma;