-- Complete database setup for Beauty Salon App
-- Run this script to set up the entire database from scratch

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Create users table for admin and staff
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('admin', 'funcionario')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_servico VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  duracao_minutos INTEGER NOT NULL
);

-- Create availability table for staff schedules
CREATE TABLE IF NOT EXISTS disponibilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  UNIQUE(funcionario_id, dia_semana, hora_inicio)
);

-- Create appointments table with payment tracking
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  funcionario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  data_agendamento DATE NOT NULL,
  hora_agendamento TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
  pago BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employee_services junction table
CREATE TABLE IF NOT EXISTS funcionario_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(funcionario_id, servico_id)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_funcionario ON agendamentos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_pago ON agendamentos(pago);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pago ON agendamentos(status, pago);
CREATE INDEX IF NOT EXISTS idx_disponibilidades_funcionario ON disponibilidades(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_servicos_funcionario ON funcionario_servicos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_funcionario_servicos_servico ON funcionario_servicos(servico_id);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionario_servicos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Public can view users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view users" ON users FOR SELECT TO authenticated USING (true);

-- Services policies
CREATE POLICY "Public can view services" ON servicos FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view services" ON servicos FOR SELECT TO authenticated USING (true);

-- Disponibilidades policies
CREATE POLICY "Public can view availability" ON disponibilidades FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view availability" ON disponibilidades FOR SELECT TO authenticated USING (true);

-- Agendamentos policies
CREATE POLICY "Public can view appointments" ON agendamentos FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view appointments" ON agendamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create appointments" ON agendamentos FOR INSERT TO authenticated WITH CHECK (true);

-- Funcionario_servicos policies
CREATE POLICY "Public can view employee services" ON funcionario_servicos FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view employee services" ON funcionario_servicos FOR SELECT TO authenticated USING (true);

-- ============================================
-- 5. INSERT SAMPLE DATA
-- ============================================

-- Insert admin user (password: admin123)
INSERT INTO users (nome, email, senha, telefone, tipo_usuario)
VALUES ('Admin', 'admin@agendebeauty.com', '$2a$10$rZ5qH8qF9YxK5YxK5YxK5eO5qH8qF9YxK5YxK5YxK5YxK5YxK5YxK', '11999999999', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample services
INSERT INTO servicos (nome_servico, descricao, preco, duracao_minutos)
VALUES 
  ('Corte de Cabelo', 'Corte masculino ou feminino', 50.00, 30),
  ('Manicure', 'Cuidados com as unhas das mãos', 35.00, 45),
  ('Pedicure', 'Cuidados com as unhas dos pés', 40.00, 45),
  ('Escova', 'Escova modeladora', 60.00, 60),
  ('Coloração', 'Coloração completa', 150.00, 120)
ON CONFLICT DO NOTHING;

-- Note: Staff users and their services should be added through the admin panel
