import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const WebhookController = {
  /**
   * Endpoint público para receber e-mails vindos de automações (Make.com, Zapier, Webhooks)
   * POST /webhooks/incoming-email
   * 
   * Mapeamento:
   * - subject -> title
   * - text/body -> description
   * - list_type -> 'backlog'
   * - due_date -> null
   */
  async handleIncomingEmail(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Payload inválido ou vazio' });
        return;
      }

      // Suporte flexível a diferentes integrações (Make, Zapier, Sendgrid, etc.)
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

      // Cria a tarefa no banco de dados com list_type = 'backlog' e due_date = null
      const task = await prisma.task.create({
        data: {
          title,
          description,
          list_type: 'backlog',
          due_date: null,
          is_completed: false,
          recurrence_rule: undefined,
        },
      });

      console.log(`[Webhook] Tarefa criada via e-mail: "${task.title}" (ID: ${task.id})`);

      res.status(201).json({
        success: true,
        message: 'Tarefa criada com sucesso a partir do e-mail recebido',
        task,
      });
    } catch (error) {
      console.error('[Webhook] Erro ao processar incoming email:', error);
      res.status(500).json({ error: 'Erro interno ao processar webhook de e-mail' });
    }
  },
};
