import webpush from 'web-push';
import prisma from '../lib/prisma.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BJDykn01fgzJfhc1NwrdyLW6_LpALFiKcGX_Hpf8-v097INNMleEDgVJQMvZFDBJX7RdfplNw62Re_ZD-sPP5S4';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'hmzu3aHnCbhrRR1rAAwJqCja6-vmarv9pe2QaFWATDU';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notificacoes@projetotodo.local';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.warn('⚠️ [WebPush] Falha ao configurar VAPID details:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
  vibrate?: number[];
  tag?: string;
}

export class NotificationService {
  static getPublicKey(): string {
    return vapidPublicKey;
  }

  static async saveSubscription(
    userId: string | null | undefined,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Assinatura Push inválida: endpoint e keys são obrigatórios');
    }

    return await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId || null,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId || null,
      },
    });
  }

  static async removeSubscription(endpoint: string) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    } catch (err) {
      console.warn('⚠️ [WebPush] Erro ao remover assinatura antiga:', err);
    }
  }

  static async sendNotificationToUser(userId: string | null | undefined, payload: PushPayload) {
    const whereClause: any = {};
    if (userId) {
      whereClause.user_id = userId;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
    });

    if (subscriptions.length === 0) {
      return { success: 0, failed: 0, total: 0 };
    }

    const messagePayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      url: payload.url || '/',
      vibrate: payload.vibrate || [200, 100, 200, 100, 200],
      tag: payload.tag || 'todo-notification',
      data: payload.data || {},
    });

    let success = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, messagePayload);
          success++;
        } catch (err: any) {
          failed++;
          console.error(`⚠️ [WebPush] Falha ao enviar para endpoint (${err.statusCode || err.message})`);
          // Se o endpoint expirou ou foi revogado (404 / 410 Gone), removemos do banco
          if (err.statusCode === 404 || err.statusCode === 410) {
            await this.removeSubscription(sub.endpoint);
          }
        }
      })
    );

    return { success, failed, total: subscriptions.length };
  }
}
