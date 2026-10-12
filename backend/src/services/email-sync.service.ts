import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import prisma from '../lib/prisma.js';
import { RealtimeService } from './realtime.service.js';
import { NotificationService } from './notification.service.js';

export interface EmailConnectionOptions {
  email: string;
  host: string;
  port?: number;
  secure?: boolean;
  password: string;
  folder?: string;
}

export class EmailSyncService {
  /**
   * Testa as credenciais de conexão IMAP sem salvar
   */
  static async testConnection(options: EmailConnectionOptions): Promise<{ success: boolean; message: string; folders?: string[] }> {
    const client = new ImapFlow({
      host: options.host,
      port: options.port || 993,
      secure: options.secure !== false,
      auth: {
        user: options.email,
        pass: options.password,
      },
      logger: false,
    });

    try {
      await client.connect();
      const list = await client.list();
      const folders = list.map((mailbox) => mailbox.path);
      await client.logout();

      return {
        success: true,
        message: 'Conexão estabelecida com sucesso! Caixa postal validada.',
        folders,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Falha ao conectar ao servidor IMAP. Verifique se o e-mail e a senha de app estão corretos.',
      };
    }
  }

  /**
   * Salva ou atualiza a configuração de e-mail do usuário
   */
  static async saveConfig(userId: string, data: EmailConnectionOptions) {
    return await prisma.userEmailConfig.upsert({
      where: { user_id: userId },
      update: {
        email: data.email.trim().toLowerCase(),
        host: data.host.trim(),
        port: data.port || 993,
        secure: data.secure !== false,
        password: data.password.trim(),
        folder: data.folder ? data.folder.trim() : 'INBOX',
        is_active: true,
      },
      create: {
        user_id: userId,
        email: data.email.trim().toLowerCase(),
        host: data.host.trim(),
        port: data.port || 993,
        secure: data.secure !== false,
        password: data.password.trim(),
        folder: data.folder ? data.folder.trim() : 'INBOX',
        is_active: true,
      },
    });
  }

  /**
   * Obtém a configuração de e-mail do usuário (mascarando a senha por segurança)
   */
  static async getConfig(userId: string) {
    const config = await prisma.userEmailConfig.findUnique({
      where: { user_id: userId },
    });

    if (!config) return null;

    return {
      id: config.id,
      email: config.email,
      host: config.host,
      port: config.port,
      secure: config.secure,
      folder: config.folder,
      is_active: config.is_active,
      last_sync_at: config.last_sync_at,
      hasPassword: Boolean(config.password),
    };
  }

  /**
   * Desconecta e remove a configuração de e-mail do usuário
   */
  static async removeConfig(userId: string) {
    return await prisma.userEmailConfig.delete({
      where: { user_id: userId },
    });
  }

  /**
   * Executa a sincronização de e-mails para um usuário específico
   */
  static async syncUser(userId: string): Promise<{ importedCount: number; message: string }> {
    const config = await prisma.userEmailConfig.findUnique({
      where: { user_id: userId },
    });

    if (!config || !config.is_active || !config.password) {
      return { importedCount: 0, message: 'Nenhuma conta de e-mail ativa configurada para sincronizar.' };
    }

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.email,
        pass: config.password,
      },
      logger: false,
    });

    let importedCount = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock(config.folder || 'INBOX');

      try {
        // Busca mensagens não lidas
        const searchCriteria = { seen: false };

        for await (const message of client.fetch(searchCriteria, { envelope: true, source: true, uid: true })) {
          try {
            if (!message.source) continue;
            const parsed = await simpleParser(message.source);

            const title = (parsed.subject && parsed.subject.trim()) || 'Nova tarefa recebida por e-mail';
            const sender = parsed.from?.text || parsed.from?.value?.[0]?.address || config.email;

            let description = parsed.text ? parsed.text.trim() : '';
            if (sender) {
              description = `[Remetente: ${sender}]\n\n${description}`;
            }

            // Cria a tarefa atribuída ao usuário correto
            const task = await prisma.task.create({
              data: {
                title,
                description,
                list_type: 'backlog',
                user_id: config.user_id,
                due_date: null,
                is_completed: false,
              },
            });

            importedCount++;

            // Notifica em tempo real a tela do usuário (PC/celular aberto)
            RealtimeService.notifyUser(config.user_id, 'task_created', task);

            // Notifica via Push no celular
            await NotificationService.sendNotificationToUser(config.user_id, {
              title: '📧 Nova tarefa importada do e-mail',
              body: task.title,
              url: '/',
              vibrate: [250, 100, 250],
            });

            // Marca o e-mail como lido para não importar novamente
            await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
          } catch (itemErr) {
            console.warn('[EmailSync] Erro ao processar mensagem individual:', itemErr);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();

      // Atualiza data da última sincronização
      await prisma.userEmailConfig.update({
        where: { id: config.id },
        data: { last_sync_at: new Date() },
      });

      return {
        importedCount,
        message: importedCount > 0
          ? `${importedCount} tarefa(s) importada(s) com sucesso a partir dos seus e-mails!`
          : 'Nenhum novo e-mail pendente encontrado para importar.',
      };
    } catch (err: any) {
      console.error('[EmailSync] Erro ao sincronizar e-mails:', err);
      return {
        importedCount: 0,
        message: `Falha na sincronização: ${err?.message || 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Rotina periódica em segundo plano no servidor (roda a cada 3 minutos)
   */
  static startBackgroundScheduler() {
    console.log('📬 [EmailSync] Serviço de sincronização periódica de e-mails ativado (intervalo: 3m)');

    setInterval(async () => {
      try {
        const activeConfigs = await prisma.userEmailConfig.findMany({
          where: { is_active: true },
        });

        for (const config of activeConfigs) {
          try {
            await this.syncUser(config.user_id);
          } catch (syncErr) {
            console.warn(`[EmailSync] Erro ao sincronizar usuário ${config.user_id}:`, syncErr);
          }
        }
      } catch (loopErr) {
        console.warn('[EmailSync] Erro no loop de sincronização periódica:', loopErr);
      }
    }, 180000); // 3 minutos
  }
}
