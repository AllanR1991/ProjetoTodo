import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// Verifica se a DATABASE_URL do PostgreSQL está configurada de verdade
const rawDbUrl = process.env.DATABASE_URL || '';
const isPostgresConfigured =
  rawDbUrl.startsWith('postgresql://') &&
  !rawDbUrl.includes('[SUA_SENHA]') &&
  !rawDbUrl.includes('SUA_SENHA');

// Banco de dados em memória para testes locais sem necessidade de PostgreSQL/Supabase configurado
class InMemoryTaskStore {
  private users: any[] = [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      name: 'Administrador',
      email: 'admin@todo.com',
      password: bcrypt.hashSync('admin123', 10),
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  private columns: any[] = [
    {
      id: 'col-my-day',
      name: 'Meu Dia',
      slug: 'my_day',
      color: '#d97706',
      icon: 'Sun',
      position: 0,
      is_system: true,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'col-planned',
      name: 'Planejadas',
      slug: 'planned',
      color: '#2564cf',
      icon: 'Calendar',
      position: 1,
      is_system: true,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'col-backlog',
      name: 'Backlog / Tarefas',
      slug: 'backlog',
      color: '#4f46e5',
      icon: 'Inbox',
      position: 2,
      is_system: true,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  private tasks: any[] = [
    {
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      title: 'Revisar métricas semanais da equipe',
      description: 'Verificar relatórios de sprint e atualizar o dashboard no Supabase.',
      list_type: 'my_day',
      due_date: new Date(),
      is_completed: false,
      completed_at: null,
      recurrence_rule: { type: 'weekly', days: [1, 3] }, // Seg e Qua
      parent_task_id: null,
      position: 0,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'a1b2c3d4-0002-4000-8000-000000000002',
      title: 'Deploy da API Express no Render',
      description: 'Configurar variáveis de ambiente DATABASE_URL e DIRECT_URL no dashboard do Render.',
      list_type: 'planned',
      due_date: new Date(Date.now() + 86400000 * 2),
      is_completed: false,
      completed_at: null,
      recurrence_rule: null,
      parent_task_id: null,
      position: 0,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'a1b2c3d4-0003-4000-8000-000000000003',
      title: 'Configurar Webhook do Make.com para e-mails',
      description: '[Remetente: suporte@cliente.com]\n\nTestar o envio de payload para /webhooks/incoming-email.',
      list_type: 'backlog',
      due_date: null,
      is_completed: false,
      completed_at: null,
      recurrence_rule: null,
      parent_task_id: null,
      position: 0,
      user_id: 'a0000000-0000-4000-8000-000000000001',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  user = {
    findUnique: async (args: any) => {
      const u = this.users.find(
        (user) => (args.where.id && user.id === args.where.id) || (args.where.email && user.email === args.where.email)
      );
      return u ? { ...u } : null;
    },

    upsert: async (args: any) => {
      const index = this.users.findIndex(
        (user) => (args.where.id && user.id === args.where.id) || (args.where.email && user.email === args.where.email)
      );
      if (index >= 0) {
        this.users[index] = { ...this.users[index], ...args.update, updated_at: new Date() };
        return { ...this.users[index] };
      }
      const newUser = {
        id: randomUUID(),
        ...args.create,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.users.push(newUser);
      return { ...newUser };
    },

    create: async (args: any) => {
      const newUser = {
        id: randomUUID(),
        ...args.data,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.users.push(newUser);
      return { ...newUser };
    },

    findMany: async () => [...this.users],
  };

  column = {
    findMany: async (args?: any) => {
      let filtered = [...this.columns];
      const where = args?.where;
      if (where?.user_id) {
        filtered = filtered.filter((c) => !c.user_id || c.user_id === where.user_id || c.is_system);
      }
      return filtered.sort((a, b) => a.position - b.position);
    },

    findFirst: async (args: any) => {
      const col = this.columns.find((c) => {
        let match = true;
        if (args?.where?.slug && c.slug !== args.where.slug) match = false;
        if (args?.where?.user_id && c.user_id && c.user_id !== args.where.user_id) match = false;
        return match;
      });
      return col ? { ...col } : null;
    },

    findUnique: async (args: any) => {
      const col = this.columns.find(
        (c) => c.id === args.where.id || (args.where.slug && c.slug === args.where.slug)
      );
      return col ? { ...col } : null;
    },

    create: async (args: any) => {
      const slug =
        args.data.slug ||
        args.data.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') ||
        `col-${Date.now()}`;

      const newColumn = {
        id: randomUUID(),
        name: args.data.name,
        slug,
        color: args.data.color || '#3b82f6',
        icon: args.data.icon || 'Folder',
        position: args.data.position ?? this.columns.length,
        is_system: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.columns.push(newColumn);
      return { ...newColumn };
    },

    update: async (args: any) => {
      const index = this.columns.findIndex((c) => c.id === args.where.id);
      if (index === -1) throw new Error('Coluna não encontrada');

      const current = this.columns[index];
      const updated = {
        ...current,
        ...args.data,
        updated_at: new Date(),
      };
      this.columns[index] = updated;
      return { ...updated };
    },

    delete: async (args: any) => {
      const index = this.columns.findIndex((c) => c.id === args.where.id);
      if (index === -1) throw new Error('Coluna não encontrada');
      const removed = this.columns.splice(index, 1)[0];

      // Move as tarefas associadas para o backlog para não perder dados
      this.tasks.forEach((t) => {
        if (t.list_type === removed.slug) {
          t.list_type = 'backlog';
        }
      });

      return removed;
    },

    count: async () => this.columns.length,
  };

  task = {
    findMany: async (args?: any) => {
      let filtered = [...this.tasks];
      const where = args?.where || {};

      if (where.list_type) {
        filtered = filtered.filter((t) => t.list_type === where.list_type);
      }

      if (where.is_completed !== undefined) {
        filtered = filtered.filter((t) => t.is_completed === where.is_completed);
      }

      // Ordena por is_completed asc, position asc, due_date asc, created_at desc
      return filtered.sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        if (a.position !== b.position && a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },

    findUnique: async (args: any) => {
      const task = this.tasks.find((t) => t.id === args.where.id);
      if (!task) return null;

      if (args?.include?.sub_instances) {
        const sub_instances = this.tasks.filter((t) => t.parent_task_id === task.id);
        return { ...task, sub_instances };
      }
      return { ...task };
    },

    create: async (args: any) => {
      const newTask = {
        id: randomUUID(),
        title: args.data.title,
        description: args.data.description ?? null,
        list_type: args.data.list_type ?? 'backlog',
        due_date: args.data.due_date ?? null,
        is_completed: args.data.is_completed ?? false,
        completed_at: null,
        recurrence_rule: args.data.recurrence_rule ?? null,
        subtasks: args.data.subtasks ?? [],
        parent_task_id: args.data.parent_task_id ?? null,
        position: args.data.position ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.tasks.unshift(newTask);
      return { ...newTask };
    },

    update: async (args: any) => {
      const index = this.tasks.findIndex((t) => t.id === args.where.id);
      if (index === -1) throw new Error('Task not found');

      const current = this.tasks[index];
      const updated = {
        ...current,
        ...args.data,
        updated_at: new Date(),
      };
      this.tasks[index] = updated;
      return { ...updated };
    },

    updateMany: async (args: any) => {
      let count = 0;
      this.tasks.forEach((t) => {
        let match = true;
        if (args?.where?.list_type && t.list_type !== args.where.list_type) match = false;
        if (args?.where?.is_completed !== undefined && t.is_completed !== args.where.is_completed) match = false;
        if (match) {
          Object.assign(t, args.data, { updated_at: new Date() });
          count++;
        }
      });
      return { count };
    },

    count: async () => this.tasks.length,

    delete: async (args: any) => {
      const index = this.tasks.findIndex((t) => t.id === args.where.id);
      if (index === -1) throw new Error('Task not found');
      // Emula onDelete: SetNull para tarefas filhas
      this.tasks.forEach((t) => {
        if (t.parent_task_id === args.where.id) {
          t.parent_task_id = null;
        }
      });
      const removed = this.tasks.splice(index, 1)[0];
      return removed;
    },
  };

  async $transaction(fn: (tx: any) => Promise<any>) {
    return await fn(this);
  }

  async $disconnect() {
    return Promise.resolve();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

let clientInstance: any;

if (isPostgresConfigured) {
  clientInstance =
    global.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = clientInstance;
  }
} else {
  console.log('⚡ [MODO TESTE LOCAL ATIVO] Nenhuma DATABASE_URL do PostgreSQL/Supabase configurada.');
  console.log('💡 Utilizando banco de dados simulado em memória com suporte a Colunas/Kanban e Tarefas.');
  clientInstance = global.prisma || new InMemoryTaskStore();
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = clientInstance;
  }
}

export const prisma = clientInstance;

/**
 * Colunas padrão essenciais do sistema
 */
export const DEFAULT_SYSTEM_COLUMNS = [
  {
    name: 'Meu Dia',
    slug: 'my_day',
    color: '#d97706',
    icon: 'Sun',
    position: 0,
    is_system: true,
  },
  {
    name: 'Planejadas',
    slug: 'planned',
    color: '#2564cf',
    icon: 'Calendar',
    position: 1,
    is_system: true,
  },
  {
    name: 'Backlog / Tarefas',
    slug: 'backlog',
    color: '#4f46e5',
    icon: 'Inbox',
    position: 2,
    is_system: true,
  },
];

/**
 * Garante que as colunas padrão existam no banco de dados (auto-seed resiliente)
 */
export async function ensureDefaultColumnsExist(): Promise<void> {
  try {
    for (const col of DEFAULT_SYSTEM_COLUMNS) {
      const existing = await prisma.column.findUnique({
        where: { slug: col.slug },
      });
      if (!existing) {
        await prisma.column.create({
          data: col,
        });
      }
    }
  } catch (err) {
    // Não interrompe o servidor caso a conexão ainda esteja instável
    console.warn('⚠️ [Auto-Seed] Não foi possível verificar/criar colunas padrão:', (err as any)?.message || err);
  }
}

export default prisma;
