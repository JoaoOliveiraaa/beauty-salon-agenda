-- Add payment tracking and completed status to appointments
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;

-- Update status check constraint to include 'concluido'
ALTER TABLE agendamentos 
DROP CONSTRAINT IF EXISTS agendamentos_status_check;

ALTER TABLE agendamentos 
ADD CONSTRAINT agendamentos_status_check 
CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_pago ON agendamentos(pago);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pago ON agendamentos(status, pago);

-- Update RLS policies to allow staff to update payment status
CREATE POLICY IF NOT EXISTS "Staff can update payment status"
ON agendamentos FOR UPDATE
USING (
  funcionario_id IN (
    SELECT id FROM users WHERE email = current_user
  )
)
WITH CHECK (
  funcionario_id IN (
    SELECT id FROM users WHERE email = current_user
  )
);
