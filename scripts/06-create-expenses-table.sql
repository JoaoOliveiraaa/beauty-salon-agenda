-- Criar tabela de despesas/custos
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
  categoria TEXT NOT NULL CHECK (categoria IN ('produtos', 'energia', 'aluguel', 'agua', 'internet', 'salarios', 'marketing', 'manutencao', 'outros')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_created_at ON despesas(created_at);

-- RLS (Row Level Security)
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver e gerenciar despesas
CREATE POLICY "Admins podem gerenciar despesas"
  ON despesas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_despesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_despesas_updated_at();

-- Inserir algumas despesas de exemplo
INSERT INTO despesas (descricao, valor, categoria, data, observacoes) VALUES
  ('Produtos de cabelo - shampoos e condicionadores', 450.00, 'produtos', CURRENT_DATE - INTERVAL '5 days', 'Compra mensal de produtos'),
  ('Conta de energia elétrica', 280.00, 'energia', CURRENT_DATE - INTERVAL '3 days', 'Referente ao mês anterior'),
  ('Aluguel do salão', 1500.00, 'aluguel', CURRENT_DATE - INTERVAL '1 day', 'Aluguel mensal'),
  ('Internet e telefone', 120.00, 'internet', CURRENT_DATE - INTERVAL '2 days', 'Plano empresarial'),
  ('Manutenção de equipamentos', 200.00, 'manutencao', CURRENT_DATE - INTERVAL '7 days', 'Conserto de secador');
