/*
  # Substituir Proforma por Fatura

  1. Alterações nas Tabelas
    - Tabela `pedidos`: Renomeia coluna `numero_proforma` para `numero_fatura`
    - Tabela `romaneios`: Renomeia coluna `numero_proforma` para `numero_fatura`
    - Tabela `bobinas`: Remove coluna `numero_proforma` (já existe `numero_fatura`)

  2. Notas
    - Esta migração padroniza a nomenclatura para usar "fatura" em vez de "proforma"
    - A tabela `bobinas` já possui a coluna `numero_fatura`, então apenas removemos a duplicada `numero_proforma`
    - Todas as referências de código precisarão ser atualizadas para usar `numero_fatura`
*/

-- Renomear coluna na tabela pedidos
ALTER TABLE pedidos 
RENAME COLUMN numero_proforma TO numero_fatura;

-- Renomear coluna na tabela romaneios
ALTER TABLE romaneios 
RENAME COLUMN numero_proforma TO numero_fatura;

-- Remover coluna duplicada da tabela bobinas (já existe numero_fatura)
ALTER TABLE bobinas 
DROP COLUMN IF EXISTS numero_proforma;