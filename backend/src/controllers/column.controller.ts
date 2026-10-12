import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { RealtimeService } from '../services/realtime.service.js';

const createColumnSchema = z.object({
  name: z.string().min(1, 'Nome da coluna é obrigatório').max(100),
  color: z.string().optional().default('#3b82f6'),
  icon: z.string().optional().default('Folder'),
  slug: z.string().optional(),
  position: z.number().optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  position: z.number().optional(),
});

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `col-${Date.now()}`
  );
}

export const ColumnController = {
  /**
   * Listar todas as colunas ordenadas por position
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const whereClause: any = userId
        ? { OR: [{ user_id: userId }, { is_system: true, user_id: null }] }
        : {};

      const columns = await prisma.column.findMany({
        where: whereClause,
        orderBy: { position: 'asc' },
      });
      res.status(200).json(columns);
    } catch (error) {
      console.error('Erro ao listar colunas:', error);
      res.status(500).json({ error: 'Erro interno ao listar colunas' });
    }
  },

  /**
   * Criar uma nova coluna personalizada com slug e position automáticos
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createColumnSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
        return;
      }

      let slug = parsed.data.slug ? generateSlug(parsed.data.slug) : generateSlug(parsed.data.name);

      // Garante que o slug seja único
      const existingSlug = await prisma.column.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      let position = parsed.data.position;
      if (position === undefined) {
        const total = await prisma.column.count().catch(() => 0);
        position = typeof total === 'number' ? total : 0;
      }

      const newColumn = await prisma.column.create({
        data: {
          name: parsed.data.name.trim(),
          slug,
          color: parsed.data.color || '#3b82f6',
          icon: parsed.data.icon || 'Folder',
          position,
          user_id: req.userId || null,
        },
      });

      RealtimeService.notifyUser(req.userId, 'columns_updated', { type: 'created', column: newColumn });

      res.status(201).json(newColumn);
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
      res.status(500).json({ error: 'Erro interno ao criar coluna' });
    }
  },

  /**
   * Atualizar uma coluna (nome, cor, ícone ou posição)
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateColumnSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
        return;
      }

      const existing = await prisma.column.findUnique({ where: { id } });
      if (!existing || (req.userId && existing.user_id && existing.user_id !== req.userId)) {
        res.status(404).json({ error: 'Coluna não encontrada' });
        return;
      }

      const updated = await prisma.column.update({
        where: { id },
        data: parsed.data,
      });

      RealtimeService.notifyUser(req.userId, 'columns_updated', { type: 'updated', column: updated });

      res.status(200).json(updated);
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
      res.status(500).json({ error: 'Erro interno ao atualizar coluna' });
    }
  },

  /**
   * Excluir uma coluna (protegendo colunas de sistema e movendo tarefas para o backlog)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await prisma.column.findUnique({ where: { id } });
      if (!existing || (req.userId && existing.user_id && existing.user_id !== req.userId)) {
        res.status(404).json({ error: 'Coluna não encontrada' });
        return;
      }

      if (existing.is_system) {
        res.status(400).json({ error: 'Colunas nativas do sistema não podem ser excluídas' });
        return;
      }

      // Preserva integridade: move tarefas para o backlog antes de excluir a coluna
      await prisma.task.updateMany({
        where: { list_type: existing.slug },
        data: { list_type: 'backlog' },
      });

      const deleted = await prisma.column.delete({ where: { id } });

      RealtimeService.notifyUser(req.userId, 'columns_updated', { type: 'deleted', id });

      res.status(200).json({
        message: 'Coluna excluída com sucesso e tarefas preservadas no backlog',
        deleted,
      });
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      res.status(500).json({ error: 'Erro interno ao excluir coluna' });
    }
  },
};
