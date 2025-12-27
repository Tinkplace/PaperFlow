/*
  # Atualizar timeline de status dos pedidos

  ## Alterações
  
  1. Atualizar constraint de status_pedido na tabela pedidos:
    - Remover: 'preparacao', 'enviado'
    - Adicionar: 'carregamento', 'aduana_br', 'aduana_ar'
    - Nova sequência: recebido → aguardando_dip → separacao → carregamento → aduana_br → aduana_ar → rota → entregue
  
  ## Notas Importantes
  - Os status antigos serão migrados automaticamente para os novos equivalentes
  - 'preparacao' → 'carregamento'
  - 'enviado' → 'aduana_br'
*/

-- Primeiro, atualizar os registros existentes com os status antigos
UPDATE pedidos 
SET status_pedido = 'carregamento' 
WHERE status_pedido = 'preparacao';

UPDATE pedidos 
SET status_pedido = 'aduana_br' 
WHERE status_pedido = 'enviado';

-- Remover o constraint antigo
ALTER TABLE pedidos 
DROP CONSTRAINT IF EXISTS pedidos_status_pedido_check;

-- Adicionar o novo constraint com os status atualizados
ALTER TABLE pedidos 
ADD CONSTRAINT pedidos_status_pedido_check 
CHECK (status_pedido IN ('recebido', 'aguardando_dip', 'separacao', 'carregamento', 'aduana_br', 'aduana_ar', 'rota', 'entregue'));