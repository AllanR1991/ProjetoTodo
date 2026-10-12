import { Request, Response } from 'express';
import { z } from 'zod';
import { EmailSyncService } from '../services/email-sync.service.js';

const emailConfigSchema = z.object({
  email: z.string().email('E-mail inválido'),
  host: z.string().min(1, 'Host IMAP é obrigatório'),
  port: z.number().optional().default(993),
  secure: z.boolean().optional().default(true),
  password: z.string().min(1, 'Senha de aplicativo é obrigatória'),
  folder: z.string().optional().default('INBOX'),
});

export class EmailSyncController {
  static async testConnection(req: Request, res: Response) {
    try {
      const parsed = emailConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      }

      const result = await EmailSyncService.testConnection(parsed.data);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao testar conexão de e-mail:', err);
      return res.status(500).json({ error: err.message || 'Erro interno ao testar conexão' });
    }
  }

  static async getConfig(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const config = await EmailSyncService.getConfig(userId);
      return res.status(200).json({ config });
    } catch (err: any) {
      console.error('Erro ao buscar configuração de e-mail:', err);
      return res.status(500).json({ error: err.message || 'Erro interno ao buscar configuração' });
    }
  }

  static async saveConfig(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const parsed = emailConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      }

      // Valida a conexão antes de salvar
      const test = await EmailSyncService.testConnection(parsed.data);
      if (!test.success) {
        return res.status(400).json({
          error: `Falha ao conectar na caixa postal: ${test.message}`,
        });
      }

      const saved = await EmailSyncService.saveConfig(userId, parsed.data);
      return res.status(200).json({
        message: 'Caixa de e-mail conectada e sincronização ativada com sucesso!',
        config: {
          id: saved.id,
          email: saved.email,
          host: saved.host,
          port: saved.port,
          folder: saved.folder,
          is_active: saved.is_active,
        },
      });
    } catch (err: any) {
      console.error('Erro ao salvar configuração de e-mail:', err);
      return res.status(500).json({ error: err.message || 'Erro interno ao salvar configuração' });
    }
  }

  static async removeConfig(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      await EmailSyncService.removeConfig(userId);
      return res.status(200).json({ message: 'Conta de e-mail desconectada com sucesso' });
    } catch (err: any) {
      console.error('Erro ao remover configuração de e-mail:', err);
      return res.status(500).json({ error: err.message || 'Erro interno ao desconectar' });
    }
  }

  static async syncNow(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const result = await EmailSyncService.syncUser(userId);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao sincronizar e-mails manualmente:', err);
      return res.status(500).json({ error: err.message || 'Erro ao sincronizar e-mails' });
    }
  }
}
