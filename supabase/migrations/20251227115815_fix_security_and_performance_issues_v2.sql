/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Indexes on Foreign Keys
  Foreign keys without indexes can cause significant performance degradation during JOIN operations
  and cascade operations. Adding these indexes will improve query performance:
    - `bobinas.nota_fiscal_id`
    - `crt_edit_history.bobina_id`
    - `pedidos_bobinas.bobina_id`
    - `pedidos_bobinas.pedido_id`
    - `romaneios.pedido_id`
    - `romaneios_bobinas.bobina_id`
    - `romaneios_bobinas.romaneio_id`

  ### 2. Remove Unused Indexes
  Unused indexes consume storage space and slow down write operations without providing
  any query performance benefit. Removing these indexes will improve INSERT/UPDATE/DELETE performance:
    - `idx_bobinas_numero_ov`
    - `idx_bobinas_status`
    - `idx_bobinas_data_entrada`
    - `idx_pedidos_numero_ov`
    - `idx_romaneios_numero`
    - `idx_romaneios_data`
    - `idx_bobinas_data_emissao`
    - `idx_bobinas_numero_crt`
    - `idx_bobinas_rua`
    - `idx_bobinas_quadra`
    - `idx_bobinas_linha`
    - `idx_pedidos_destinos_pedido`
    - `idx_pre_cadastro_numero_crt`

  ### 3. Fix Function Search Path
  The function `update_pre_cadastro_updated_at` will be recreated with an immutable search_path
  to prevent potential security vulnerabilities.

  ## Security Impact
  - Improved query performance reduces potential for performance-based DoS
  - Fixed search_path prevents potential SQL injection via search_path manipulation
  - Reduced index maintenance overhead improves overall system responsiveness
*/

-- ============================================================================
-- Add Missing Indexes on Foreign Keys
-- ============================================================================

-- Index on bobinas.nota_fiscal_id
CREATE INDEX IF NOT EXISTS idx_bobinas_nota_fiscal_id 
  ON bobinas(nota_fiscal_id);

-- Index on crt_edit_history.bobina_id
CREATE INDEX IF NOT EXISTS idx_crt_edit_history_bobina_id 
  ON crt_edit_history(bobina_id);

-- Index on pedidos_bobinas.bobina_id
CREATE INDEX IF NOT EXISTS idx_pedidos_bobinas_bobina_id 
  ON pedidos_bobinas(bobina_id);

-- Index on pedidos_bobinas.pedido_id
CREATE INDEX IF NOT EXISTS idx_pedidos_bobinas_pedido_id 
  ON pedidos_bobinas(pedido_id);

-- Index on romaneios.pedido_id
CREATE INDEX IF NOT EXISTS idx_romaneios_pedido_id 
  ON romaneios(pedido_id);

-- Index on romaneios_bobinas.bobina_id
CREATE INDEX IF NOT EXISTS idx_romaneios_bobinas_bobina_id 
  ON romaneios_bobinas(bobina_id);

-- Index on romaneios_bobinas.romaneio_id
CREATE INDEX IF NOT EXISTS idx_romaneios_bobinas_romaneio_id 
  ON romaneios_bobinas(romaneio_id);

-- ============================================================================
-- Remove Unused Indexes
-- ============================================================================

-- Drop unused indexes on bobinas table
DROP INDEX IF EXISTS idx_bobinas_numero_ov;
DROP INDEX IF EXISTS idx_bobinas_status;
DROP INDEX IF EXISTS idx_bobinas_data_entrada;
DROP INDEX IF EXISTS idx_bobinas_data_emissao;
DROP INDEX IF EXISTS idx_bobinas_numero_crt;
DROP INDEX IF EXISTS idx_bobinas_rua;
DROP INDEX IF EXISTS idx_bobinas_quadra;
DROP INDEX IF EXISTS idx_bobinas_linha;

-- Drop unused indexes on pedidos table
DROP INDEX IF EXISTS idx_pedidos_numero_ov;

-- Drop unused indexes on romaneios table
DROP INDEX IF EXISTS idx_romaneios_numero;
DROP INDEX IF EXISTS idx_romaneios_data;

-- Drop unused indexes on pedidos_destinos table
DROP INDEX IF EXISTS idx_pedidos_destinos_pedido;

-- Drop unused indexes on pre_cadastro table
DROP INDEX IF EXISTS idx_pre_cadastro_numero_crt;

-- ============================================================================
-- Fix Function Search Path
-- ============================================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_update_pre_cadastro_updated_at ON pre_cadastro;

-- Drop the existing function
DROP FUNCTION IF EXISTS update_pre_cadastro_updated_at();

-- Recreate function with secure search_path
CREATE OR REPLACE FUNCTION update_pre_cadastro_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_pre_cadastro_updated_at
  BEFORE UPDATE ON pre_cadastro
  FOR EACH ROW
  EXECUTE FUNCTION update_pre_cadastro_updated_at();