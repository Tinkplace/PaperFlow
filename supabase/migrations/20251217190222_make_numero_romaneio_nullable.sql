/*
  # Tornar numero_romaneio opcional na tabela romaneios

  1. Alterações
    - Remove a constraint NOT NULL da coluna numero_romaneio
    - Remove a constraint UNIQUE da coluna numero_romaneio
    
  2. Motivo
    - A numeração automática não é mais necessária
    - Os romaneios serão identificados pelo ID gerado automaticamente
    - Mantém a coluna para preservar dados históricos
*/

ALTER TABLE romaneios ALTER COLUMN numero_romaneio DROP NOT NULL;

ALTER TABLE romaneios DROP CONSTRAINT IF EXISTS romaneios_numero_romaneio_key;