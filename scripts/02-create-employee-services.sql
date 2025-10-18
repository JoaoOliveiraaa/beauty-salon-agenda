-- Create employee_services junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS funcionario_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(funcionario_id, servico_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_funcionario_servicos_funcionario ON funcionario_servicos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_servicos_servico ON funcionario_servicos(servico_id);

-- Enable RLS
ALTER TABLE funcionario_servicos ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage employee services
CREATE POLICY "Admins can manage employee services"
  ON funcionario_servicos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario = 'admin'
    )
  );

-- Allow staff to view their own services
CREATE POLICY "Staff can view their own services"
  ON funcionario_servicos
  FOR SELECT
  TO authenticated
  USING (funcionario_id = auth.uid());

-- Allow public to view employee services (for booking)
CREATE POLICY "Public can view employee services"
  ON funcionario_servicos
  FOR SELECT
  TO anon
  USING (true);
