import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  CompleteTaskResponse,
  ListType,
  ColumnList,
  CreateColumnDTO,
  UpdateColumnDTO,
  User,
  AuthResponse,
} from '../types/task';

export interface EmailConfigData {
  id?: string;
  email: string;
  host: string;
  port?: number;
  secure?: boolean;
  folder?: string;
  is_active?: boolean;
  last_sync_at?: string | null;
  hasPassword?: boolean;
}

export interface EmailTestPayload {
  email: string;
  host: string;
  port?: number;
  secure?: boolean;
  password: string;
  folder?: string;
}

export interface EmailSavePayload {
  email: string;
  host: string;
  port?: number;
  secure?: boolean;
  password?: string;
  folder?: string;
  is_active?: boolean;
}

const TOKEN_KEY = 'todo_auth_token';
const USER_KEY = 'todo_auth_user';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return ''; // usa rotas relativas na mesma origem
    }
  }
  return 'http://localhost:4000';
};

const API_BASE_URL = getBaseUrl();

class ApiService {
  private unauthorizedListeners: Array<() => void> = [];

  onUnauthorized(callback: () => void): () => void {
    this.unauthorizedListeners.push(callback);
    return () => {
      this.unauthorizedListeners = this.unauthorizedListeners.filter((cb) => cb !== callback);
    };
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  // --- AUTENTICAÇÃO ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }

    return response;
  }

  async getMe(): Promise<User> {
    const user = await this.request<User>('/auth/me');
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        // Sessão inválida ou expirada
        if (!endpoint.includes('/auth/login')) {
          this.logout();
          this.unauthorizedListeners.forEach((listener) => listener());
        }
      }

      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson.error) {
            errorMessage = errorJson.details && typeof errorJson.details === 'string'
              ? `${errorJson.error} (${errorJson.details})`
              : errorJson.error;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Falha na requisição para ${endpoint}:`, error);
      throw error;
    }
  }

  // --- TAREFAS ---
  async getTasks(params?: { list_type?: ListType; is_completed?: boolean }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.list_type) query.append('list_type', params.list_type);
    if (params?.is_completed !== undefined) query.append('is_completed', String(params.is_completed));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Task[]>(`/tasks${queryString}`);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskDTO): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: UpdateTaskDTO): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeTask(id: string, uncomplete: boolean = false): Promise<CompleteTaskResponse> {
    const query = uncomplete ? '?uncomplete=true' : '';
    return this.request<CompleteTaskResponse>(`/tasks/${id}/complete${query}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: !uncomplete }),
    });
  }

  async deleteTask(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // --- COLUNAS / LISTAS ---
  async getColumns(): Promise<ColumnList[]> {
    return this.request<ColumnList[]>('/columns');
  }

  async createColumn(data: CreateColumnDTO): Promise<ColumnList> {
    return this.request<ColumnList>('/columns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateColumn(id: string, data: UpdateColumnDTO): Promise<ColumnList> {
    return this.request<ColumnList>(`/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteColumn(id: string): Promise<{ message: string; deleted: ColumnList }> {
    return this.request<{ message: string; deleted: ColumnList }>(`/columns/${id}`, {
      method: 'DELETE',
    });
  }

  // Notificações Web Push
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return this.request<{ publicKey: string }>('/notifications/public-key');
  }

  async savePushSubscription(subscription: any): Promise<{ message: string; subscriptionId: string }> {
    return this.request<{ message: string; subscriptionId: string }>('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  async sendTestNotification(): Promise<{ message: string; result: any }> {
    return this.request<{ message: string; result: any }>('/notifications/test', {
      method: 'POST',
    });
  }

  // --- SINCRONIZAÇÃO DE E-MAIL (IMAP DIRETO MULTI-USUÁRIO) ---
  async getEmailConfig(): Promise<{ hasConfig: boolean; config: EmailConfigData | null }> {
    return this.request<{ hasConfig: boolean; config: EmailConfigData | null }>('/email-sync/config');
  }

  async testEmailConnection(data: EmailTestPayload): Promise<{ success: boolean; message: string; folders?: string[] }> {
    return this.request<{ success: boolean; message: string; folders?: string[] }>('/email-sync/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveEmailConfig(data: EmailSavePayload): Promise<{ message: string; config: EmailConfigData }> {
    return this.request<{ message: string; config: EmailConfigData }>('/email-sync/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeEmailConfig(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/email-sync/config', {
      method: 'DELETE',
    });
  }

  async syncEmailsNow(): Promise<{ importedCount: number; message: string }> {
    return this.request<{ importedCount: number; message: string }>('/email-sync/sync-now', {
      method: 'POST',
    });
  }

  // Conexão em tempo real (Server-Sent Events) para sincronização instantânea entre PC e Celular
  subscribeToRealtime(
    onEvent: (event: { type: string; data: any }) => void,
    onError?: (err: any) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const token = this.getToken();
    const url = `${API_BASE_URL}/realtime/events?token=${encodeURIComponent(token || '')}`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        eventSource = new EventSource(url);

        const eventTypes = [
          'task_created',
          'task_updated',
          'task_completed',
          'task_deleted',
          'columns_updated',
        ];

        eventTypes.forEach((type) => {
          eventSource?.addEventListener(type, (e: MessageEvent) => {
            try {
              const data = JSON.parse(e.data);
              onEvent({ type, data });
            } catch (parseErr) {
              console.warn(`[Realtime] Erro ao processar evento "${type}":`, parseErr);
            }
          });
        });

        eventSource.onerror = (err) => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            eventSource.close();
            eventSource = null;
            if (!isClosed) {
              // Tenta reconectar após 4 segundos se o servidor reiniciar
              reconnectTimeout = setTimeout(connect, 4000);
            }
          }
          if (onError) onError(err);
        };
      } catch (err) {
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 4000);
        }
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }
}

export const api = new ApiService();


