import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

function extractEmail(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw.address) return String(raw.address).toLowerCase().trim();
  if (typeof raw !== 'string') return null;
  const match = raw.match(/<([^>]+)>/) || raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase().trim() : raw.toLowerCase().trim();
}

export const WebhookController = {
  /**
   * Endpoint inteligente para receber e-mails vindos de automações (Make.com, Zapier, Webhooks)
   * POST /webhooks/incoming-email
   * Suporta multi-usuário seguro:
   * 1. Pelo token pessoal do usuário: ?token=... ou { token: "..." }
   * 2. Pelo endereço de e-mail do remetente: from: "usuario@email.com"
   */
  async handleIncomingEmail(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Payload inválido ou vazio' });
        return;
      }

      const rawSubject =
        payload.subject ||
        payload.title ||
        payload.Subject ||
        payload['email[subject]'];

      const rawBody =
        payload.text ||
        payload.body ||
        payload['body-plain'] ||
        payload.stripped_text ||
        payload.html ||
        payload.content ||
        payload['email[body]'];

      const sender = payload.from || payload.sender || payload['email[from]'] || null;

      // Identificação inteligente do usuário para isolamento total
      let targetUserId: string | null = null;
      const rawToken = (req.query.token as string) || payload.token || req.headers['x-user-token'];

      if (rawToken && typeof rawToken === 'string') {
        try {
          const { AuthService } = await import('../services/auth.service.js');
          const decoded = AuthService.verifyToken(rawToken);
          targetUserId = decoded.userId;
        } catch {
          const userById = await prisma.user.findUnique({ where: { id: rawToken } }).catch(() => null);
          if (userById) targetUserId = userById.id;
        }
      }

      const cleanSenderEmail = extractEmail(sender);
      if (!targetUserId && cleanSenderEmail) {
        const userByEmail = await prisma.user.findFirst({
          where: { email: { equals: cleanSenderEmail, mode: 'insensitive' } },
        });
        if (userByEmail) {
          targetUserId = userByEmail.id;
        }
      }

      // Se nenhum usuário for identificado, verifica se há apenas 1 usuário no sistema para tolerância
      if (!targetUserId) {
        const totalUsers = await prisma.user.count();
        if (totalUsers === 1) {
          const onlyUser = await prisma.user.findFirst();
          if (onlyUser) targetUserId = onlyUser.id;
        } else {
          res.status(403).json({
            error: 'Remetente não autorizado. O e-mail não pertence a nenhum usuário cadastrado no sistema.',
            sender: cleanSenderEmail || sender,
          });
          return;
        }
      }

      // Se o subject vier vazio, define um título padrão legível
      const title = rawSubject && typeof rawSubject === 'string' && rawSubject.trim().length > 0
        ? rawSubject.trim()
        : 'Nova tarefa recebida por e-mail';

      // Constrói a descrição anexando remetente caso disponível
      let description: string | null = null;
      if (rawBody && typeof rawBody === 'string' && rawBody.trim().length > 0) {
        description = rawBody.trim();
        if (sender) {
          description = `[Remetente: ${sender}]\n\n${description}`;
        }
      } else if (sender) {
        description = `[Remetente: ${sender}]`;
      }

      // Cria a tarefa atribuída ao usuário correto no backlog
      const task = await prisma.task.create({
        data: {
          title,
          description,
          list_type: 'backlog',
          due_date: null,
          is_completed: false,
          user_id: targetUserId,
        },
      });

      console.log(`[Webhook] Tarefa criada para usuário ${targetUserId}: "${task.title}" (ID: ${task.id})`);

      // Atualiza a tela do usuário em tempo real (SSE) e notifica o celular dele com vibração
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const { RealtimeService } = await import('../services/realtime.service.js');

        // Notifica APENAS o usuário dono da tarefa
        RealtimeService.notifyUser(targetUserId, 'task_created', task);

        await NotificationService.sendNotificationToUser(targetUserId, {
          title: '📧 Nova tarefa via e-mail',
          body: task.title,
          url: '/',
          vibrate: [250, 100, 250],
        });
      } catch (pushErr) {
        console.warn('⚠️ [Webhook] Não foi possível disparar push notification / SSE:', pushErr);
      }

      res.status(201).json({
        success: true,
        message: 'Tarefa criada com sucesso e sincronizada para o usuário',
        taskId: task.id,
        userId: targetUserId,
      });
    } catch (error) {
      console.error('[Webhook] Erro ao processar incoming email:', error);
      res.status(500).json({ error: 'Erro interno ao processar webhook de e-mail' });
    }
  },
};
