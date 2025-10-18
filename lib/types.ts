export type UserType = "admin" | "funcionario"

export interface User {
  id: string
  nome: string
  email: string
  telefone: string | null
  tipo_usuario: UserType
  criado_em: string
}

export interface Service {
  id: string
  nome_servico: string
  descricao: string | null
  preco: number
  duracao_minutos: number
}

export interface Availability {
  id: string
  funcionario_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export type AppointmentStatus = "pendente" | "confirmado" | "cancelado"

export interface Appointment {
  id: string
  cliente_nome: string
  cliente_telefone: string
  funcionario_id: string
  servico_id: string
  data_agendamento: string
  hora_agendamento: string
  status: AppointmentStatus
  criado_em: string
  funcionario?: User
  servico?: Service
}

export interface EmployeeService {
  id: string
  funcionario_id: string
  servico_id: string
  criado_em: string
}
