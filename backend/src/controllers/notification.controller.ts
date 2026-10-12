import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async getPublicKey(req: Request, res: Response) {
    try {
      const publicKey = NotificationService.getPublicKey();
      res.status(200).json({ publicKey });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao obter chave pública VAPID' });
    }
  }

  static async subscribe(req: Request, res: Response) {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys) {
        return res.status(400).json({ error: 'Payload de inscrição incompleto (endpoint e keys obrigatórios)' });
      }

      const userId = (req as any).user?.id || null;
      const saved = await NotificationService.saveSubscription(userId, { endpoint, keys });

      res.status(200).json({
        message: 'Inscrição para notificações ativada com sucesso!',
        subscriptionId: saved.id,
      });
    } catch (err: any) {
      console.error('Erro ao salvar push subscription:', err);
      res.status(500).json({ error: err.message || 'Erro ao registrar notificações' });
    }
  }

  static async unsubscribe(req: Request, res: Response) {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await NotificationService.removeSubscription(endpoint);
      }
      res.status(200).json({ message: 'Inscrição removida com sucesso' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao desinscrever notificações' });
    }
  }

  static async sendTestNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || null;
      const result = await NotificationService.sendNotificationToUser(userId, {
        title: '🔔 Notificação do Tarefas!',
        body: 'Seu celular está configurado para vibrar e receber lembretes de tarefas.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: '/',
        vibrate: [200, 100, 200, 100, 200],
      });

      if (result.total === 0) {
        return res.status(404).json({
          message: 'Nenhum dispositivo inscrito encontrado para este usuário. Ative as notificações no navegador primeiro!',
          result,
        });
      }

      res.status(200).json({
        message: 'Notificação enviada com sucesso!',
        result,
      });
    } catch (err: any) {
      console.error('Erro ao enviar notificação de teste:', err);
      res.status(500).json({ error: err.message || 'Erro ao disparar notificação' });
    }
  }
}
