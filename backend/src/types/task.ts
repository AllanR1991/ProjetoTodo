export type ListType = string;

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type MonthlyMode = 'day_of_month' | 'nth_weekday';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number; // Repetir a cada N dias/semanas/meses (default: 1)

  // Configurações Semanais
  days?: number[]; // Dias da semana: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

  // Configurações Mensais Avançadas
  monthly_mode?: MonthlyMode; // 'day_of_month' (dia fixo) | 'nth_weekday' (ex: 2ª semana do mês)
  day_of_month?: number;      // Dia do mês (1 a 31, ex: todo dia 15 ou -1 para último dia)
  week_number?: number;       // 1 = primeira, 2 = segunda, 3 = terceira, 4 = quarta, -1 = última
  weekday?: number;           // Dia da semana único (legado)
  weekdays?: number[];        // Múltiplos dias da semana na mesma semana (ex: [2, 4] para Ter e Qui)
}

export interface ColumnList {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  is_system?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CreateColumnDTO {
  name: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
  position?: number;
}

export interface UpdateColumnDTO {
  name?: string;
  color?: string | null;
  icon?: string | null;
  position?: number;
}

export interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface CreateTaskDTO {
  title: string;
  description?: string | null;
  list_type?: ListType;
  due_date?: string | Date | null;
  recurrence_rule?: RecurrenceRule | null;
  subtasks?: Subtask[] | null;
  parent_task_id?: string | null;
  position?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  list_type?: ListType;
  due_date?: string | Date | null;
  is_completed?: boolean;
  recurrence_rule?: RecurrenceRule | null;
  subtasks?: Subtask[] | null;
  position?: number;
}

export interface CompleteTaskResponse {
  completedTask: {
    id: string;
    title: string;
    is_completed: boolean;
    completed_at: Date | null;
    [key: string]: any;
  };
  nextTask?: {
    id: string;
    title: string;
    due_date: Date | null;
    parent_task_id: string | null;
    [key: string]: any;
  } | null;
  message: string;
}

export interface IncomingEmailWebhookPayload {
  subject?: string;
  title?: string;
  text?: string;
  body?: string;
  html?: string;
  content?: string;
  from?: string;
  sender?: string;
  date?: string;
}
