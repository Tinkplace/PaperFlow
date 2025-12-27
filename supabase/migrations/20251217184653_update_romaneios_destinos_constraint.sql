/*
  # Atualizar constraint de destinos da tabela romaneios

  1. Alterações
    - Remove a constraint antiga de destinos da tabela romaneios
    - Adiciona nova constraint com todos os destinos possíveis, incluindo os que estão na tabela pedidos
    
  2. Destinos adicionados
    - Pilar
    - Buenos Aires
    - Santa Fé
    - Rosário
    - Mendoza
    
  3. Motivo
    - Garantir que todos os destinos que podem ser selecionados em pedidos também possam ser usados em romaneios
*/

ALTER TABLE romaneios DROP CONSTRAINT IF EXISTS romaneios_destino_check;

ALTER TABLE romaneios ADD CONSTRAINT romaneios_destino_check 
  CHECK (destino = ANY (ARRAY[
    'Lujan'::text, 
    'Parana'::text, 
    'Quilmes'::text, 
    'Arroyito'::text, 
    'San Juan'::text, 
    'Medlog'::text, 
    'Cordoba'::text, 
    'zarati'::text, 
    'Sarandi'::text, 
    'Santiago'::text,
    'Pilar'::text,
    'Buenos Aires'::text,
    'Santa Fé'::text,
    'Rosário'::text,
    'Mendoza'::text
  ]));