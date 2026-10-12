export type ListType = string;

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type MonthlyMode = 'day_of_month' | 'nth_weekday';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number; // A cada N dias/semanas/meses (default: 1)
  
  // Semanal
  days?: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

  // Mensal Avançado
  monthly_mode?: MonthlyMode; // 'day_of_month' ou 'nth_weekday'
  day_of_month?: number;      // 1 a 31 (ex: todo dia 15 ou -1 para último dia)
  week_number?: number;       // 1 = 1ª, 2 = 2ª, 3 = 3ª, 4 = 4ª, -1 = última
  weekday?: number;           // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  weekdays?: number[];        // Múltiplos dias na mesma semana do mês (ex: [2, 4])
}

export interface ColumnList {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  is_system?: boolean;
}

export interface CreateColumnDTO {
  name: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  list_type: ListType;
  due_date: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  recurrence_rule: RecurrenceRule | null;
  subtasks?: Subtask[] | null;
  parent_task_id: string | null;
  position?: number;
  created_at: string;
  updated_at: string;
  sub_instances?: Task[];
}

export interface CreateTaskDTO {
  title: string;
  description?: string | null;
  list_type?: ListType;
  due_date?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  subtasks?: Subtask[] | null;
  parent_task_id?: string | null;
  position?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  list_type?: ListType;
  due_date?: string | null;
  is_completed?: boolean;
  recurrence_rule?: RecurrenceRule | null;
  subtasks?: Subtask[] | null;
  position?: number;
}

export interface CompleteTaskResponse {
  completedTask: Task;
  nextTask: Task | null;
  message: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

