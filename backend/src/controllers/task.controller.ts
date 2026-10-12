import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { calculateNextDueDate, calculateNextNOccurrences } from '../services/recurrence.service.js';
import { RecurrenceRule } from '../types/task.js';
import { RealtimeService } from '../services/realtime.service.js';

// Schemas de validação Zod
const createTaskSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório').max(255),
  description: z.string().nullable().optional(),
  list_type: z.string().default('backlog'),
  due_date: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  recurrence_rule: z.any().nullable().optional(),
  subtasks: z.any().nullable().optional(),
  parent_task_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  list_type: z.string().optional(),
  due_date: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  is_completed: z.boolean().optional(),
  recurrence_rule: z.any().nullable().optional(),
  subtasks: z.any().nullable().optional(),
  parent_task_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
});

export const TaskController = {
  /**
   * Listar tarefas com filtros opcionais (list_type, is_completed)
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { list_type, is_completed } = req.query;

      const whereClause: any = {};

      if (list_type && typeof list_type === 'string') {
        whereClause.list_type = list_type;
      }

      if (is_completed !== undefined) {
        whereClause.is_completed = is_completed === 'true';
      }

      if (req.userId) {
        whereClause.user_id = req.userId;
      }

      const tasks = await prisma.task.findMany({
        where: whereClause,
        orderBy: [
          { is_completed: 'asc' },
          { position: 'asc' },
          { due_date: 'asc' },
          { created_at: 'desc' },
        ],
      });

      res.status(200).json(tasks);
    } catch (error) {
      console.error('Erro ao listar tarefas:', error);
      res.status(500).json({ error: 'Erro interno ao listar tarefas' });
    }
  },

  /**
   * Buscar uma tarefa por ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          sub_instances: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
        },
      });

      if (!task || (req.userId && task.user_id && task.user_id !== req.userId)) {
        res.status(404).json({ error: 'Tarefa não encontrada' });
        return;
      }

      res.status(200).json(task);
    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      res.status(500).json({ error: 'Erro interno ao buscar tarefa' });
    }
  },

  /**
   * Criar uma nova tarefa
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createTaskSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
        return;
      }

      const { title, description, list_type, due_date, recurrence_rule, subtasks, parent_task_id, position } = parsed.data;

      const newTask = await prisma.task.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          list_type: list_type || 'backlog',
          due_date: due_date ? new Date(due_date) : null,
          recurrence_rule: recurrence_rule ? recurrence_rule : undefined,
          subtasks: subtasks ?? [],
          parent_task_id: parent_task_id || null,
          position: position ?? 0,
          user_id: req.userId || null,
        },
      });

      // Notifica todos os dispositivos conectados do usuário em tempo real
      RealtimeService.notifyUser(req.userId, 'task_created', newTask);

      res.status(201).json(newTask);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({ error: 'Erro interno ao criar tarefa' });
    }
  },

  /**
   * Atualizar uma tarefa existente
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateTaskSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
        return;
      }

      const existingTask = await prisma.task.findUnique({ where: { id } });
      if (!existingTask || (req.userId && existingTask.user_id && existingTask.user_id !== req.userId)) {
        res.status(404).json({ error: 'Tarefa não encontrada' });
        return;
      }

      const updateData: any = {};
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
      if (parsed.data.description !== undefined) updateData.description = parsed.data.description ? parsed.data.description.trim() : null;
      if (parsed.data.list_type !== undefined) updateData.list_type = parsed.data.list_type;
      if (parsed.data.due_date !== undefined) updateData.due_date = parsed.data.due_date ? new Date(parsed.data.due_date) : null;
      if (parsed.data.position !== undefined) updateData.position = parsed.data.position;
      if (parsed.data.is_completed !== undefined) {
        updateData.is_completed = parsed.data.is_completed;
        updateData.completed_at = parsed.data.is_completed ? new Date() : null;
      }
      if (parsed.data.recurrence_rule !== undefined) {
        updateData.recurrence_rule = parsed.data.recurrence_rule;
      }
      if (parsed.data.subtasks !== undefined) {
        updateData.subtasks = parsed.data.subtasks;
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: updateData,
      });

      // Notifica todos os dispositivos conectados do usuário em tempo real
      RealtimeService.notifyUser(req.userId, 'task_updated', updatedTask);

      res.status(200).json(updatedTask);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      res.status(500).json({ error: 'Erro interno ao atualizar tarefa' });
    }
  },

  /**
   * Concluir tarefa (Core: Gera próxima instância se possuir recurrence_rule)
   * PATCH /tasks/:id/complete
   */
  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const currentTask = await prisma.task.findUnique({
        where: { id },
      });

      if (!currentTask || (req.userId && currentTask.user_id && currentTask.user_id !== req.userId)) {
        res.status(404).json({ error: 'Tarefa não encontrada' });
        return;
      }

      // Se a tarefa já estava concluída e chamada novamente, suporta desmarcar se enviado ?uncomplete=true
      if (req.query.uncomplete === 'true' || req.body?.is_completed === false) {
        const uncompleted = await prisma.task.update({
          where: { id },
          data: { is_completed: false, completed_at: null },
        });
        res.status(200).json({ completedTask: uncompleted, nextTask: null, message: 'Tarefa desmarcada' });
        return;
      }

      const now = new Date();
      const recurrence = currentTask.recurrence_rule as RecurrenceRule | null;

      // Executa de forma atômica no banco de dados
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Marca a tarefa atual como concluída
        const completedTask = await tx.task.update({
          where: { id },
          data: {
            is_completed: true,
            completed_at: now,
          },
        });

        let nextTask = null;

        // 2. Se possuir recurrence_rule, calcula próxima data válida e faz INSERT
        if (recurrence && recurrence.type) {
          const nextDueDate = calculateNextDueDate(recurrence, currentTask.due_date || now);

          // Rastreia a tarefa mãe/mestre da série
          const masterParentId = currentTask.parent_task_id || currentTask.id;

          nextTask = await tx.task.create({
            data: {
              title: currentTask.title,
              description: currentTask.description,
              list_type: currentTask.list_type,
              due_date: nextDueDate,
              is_completed: false,
              recurrence_rule: currentTask.recurrence_rule as any,
              subtasks: currentTask.subtasks && Array.isArray(currentTask.subtasks)
                ? currentTask.subtasks.map((st: any) => ({ ...st, is_completed: false }))
                : [],
              parent_task_id: masterParentId,
              user_id: currentTask.user_id || req.userId || null,
            },
          });
        }

        return { completedTask, nextTask };
      });

      // Notifica todos os dispositivos conectados do usuário em tempo real
      RealtimeService.notifyUser(req.userId, 'task_completed', result);

      res.status(200).json({
        completedTask: result.completedTask,
        nextTask: result.nextTask,
        message: result.nextTask
          ? 'Tarefa concluída e próxima ocorrência agendada com sucesso!'
          : 'Tarefa concluída com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      res.status(500).json({ error: 'Erro interno ao concluir tarefa' });
    }
  },

  /**
   * Deletar uma tarefa
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existingTask = await prisma.task.findUnique({ where: { id } });
      if (!existingTask || (req.userId && existingTask.user_id && existingTask.user_id !== req.userId)) {
        res.status(404).json({ error: 'Tarefa não encontrada' });
        return;
      }

      await prisma.task.delete({ where: { id } });

      // Notifica todos os dispositivos conectados do usuário em tempo real
      RealtimeService.notifyUser(req.userId, 'task_deleted', { id });

      res.status(200).json({ message: 'Tarefa excluída com sucesso', id });
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      res.status(500).json({ error: 'Erro interno ao excluir tarefa' });
    }
  },

  /**
   * Prever as próximas N ocorrências de uma regra de recorrência
   * POST /tasks/preview-recurrence
   * Body: { recurrence_rule: RecurrenceRule, from_date?: string, count?: number }
   */
  async previewRecurrence(req: Request, res: Response): Promise<void> {
    try {
      const { recurrence_rule, from_date, count } = req.body;
      const countNumber = Math.min(20, Math.max(1, Number(count) || 5));
      const occurrences = calculateNextNOccurrences(recurrence_rule, from_date, countNumber);

      res.status(200).json({
        rule: recurrence_rule,
        count: occurrences.length,
        occurrences,
        formatted: occurrences.map((d, i) => ({
          index: i + 1,
          iso: d.toISOString(),
          weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
          formatted: d.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        })),
      });
    } catch (error) {
      console.error('Erro ao calcular prévia de recorrência:', error);
      res.status(500).json({ error: 'Erro ao calcular prévia de recorrência' });
    }
  },
};
