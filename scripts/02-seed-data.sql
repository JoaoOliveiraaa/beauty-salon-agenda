-- Insert default admin user (password: admin123 - should be hashed in production)
-- IMPORTANTE: Se você já rodou scripts anteriores, delete todos os dados da tabela users primeiro:
-- DELETE FROM users;

INSERT INTO users (nome, email, senha, telefone, tipo_usuario)
VALUES 
  ('Administrador', 'admin@agendebeauty.com', 'admin123', '(11) 99999-9999', 'admin'),
  ('Maria Silva', 'maria@agendebeauty.com', 'senha123', '(11) 98888-8888', 'funcionario'),
  ('Ana Santos', 'ana@agendebeauty.com', 'senha123', '(11) 97777-7777', 'funcionario')
ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha;

-- Insert sample services
INSERT INTO servicos (nome_servico, descricao, preco, duracao_minutos)
VALUES 
  ('Corte de Cabelo Feminino', 'Corte e finalização', 80.00, 60),
  ('Corte de Cabelo Masculino', 'Corte e finalização', 50.00, 30),
  ('Manicure', 'Esmaltação simples', 35.00, 45),
  ('Pedicure', 'Esmaltação simples', 40.00, 60),
  ('Escova', 'Escova modeladora', 60.00, 45),
  ('Hidratação', 'Tratamento capilar', 100.00, 90),
  ('Coloração', 'Coloração completa', 150.00, 120),
  ('Maquiagem', 'Maquiagem profissional', 120.00, 60)
ON CONFLICT DO NOTHING;
