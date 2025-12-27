/*
  # Add CRT Edit History Table

  1. New Tables
    - `crt_edit_history`
      - `id` (uuid, primary key)
      - `numero_crt` (text) - CRT number that was edited
      - `bobina_id` (uuid) - Reference to the bobina that was edited
      - `field_name` (text) - Name of the field that was changed
      - `old_value` (text) - Previous value
      - `new_value` (text) - New value
      - `justification` (text) - Reason for the change
      - `edited_by` (text) - User who made the change
      - `created_at` (timestamptz) - When the change was made

  2. Security
    - Enable RLS on `crt_edit_history` table
    - Add policy for reading edit history
    - Add policy for inserting edit history
*/

CREATE TABLE IF NOT EXISTS crt_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_crt text NOT NULL,
  bobina_id uuid REFERENCES bobinas(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  justification text NOT NULL,
  edited_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crt_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read edit history"
  ON crt_edit_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert edit history"
  ON crt_edit_history FOR INSERT
  WITH CHECK (true);