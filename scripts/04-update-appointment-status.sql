-- Add 'concluido' status to appointments
ALTER TABLE agendamentos 
DROP CONSTRAINT IF EXISTS agendamentos_status_check;

ALTER TABLE agendamentos 
ADD CONSTRAINT agendamentos_status_check 
CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado'));

-- Update default status
ALTER TABLE agendamentos 
ALTER COLUMN status SET DEFAULT 'pendente';
