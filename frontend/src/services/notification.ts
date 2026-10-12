import { api } from './api';

/**
 * Converte chave pública VAPID em formato Base64 para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Toca um aviso sonoro harmônico e suave usando a Web Audio API (compatível com PC e celular)
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Primeiro tom (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Segundo tom mais agudo (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.16, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignora se o navegador restringir áudio antes da primeira interação
  }
}

/**
 * Exibe notificação no desktop/celular e toca o alerta sonoro
 */
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  playNotificationSound();
  triggerHaptic([50, 30, 50]);
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Dispara vibração háptica no celular
 */
export function triggerHaptic(pattern: number | number[] = 50): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignora erro se o navegador restringir vibração sem gesto ativo
    }
  }
}

/**
 * Verifica se o navegador atual suporta notificações Push e Service Worker
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Retorna o status atual de permissão de notificações
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão e cadastra o aparelho para receber notificações
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      message: 'Seu navegador atual não suporta notificações Push. No iPhone, adicione o app à Tela de Início primeiro!',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Permissão para notificações não foi concedida pelo usuário.',
      };
    }

    // Registra ou obtém o Service Worker
    const registration = await navigator.serviceWorker.ready;

    // Obtém a chave pública VAPID do backend
    const { publicKey } = await api.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Chave VAPID pública não configurada no backend');
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Obtém ou cria a assinatura do navegador
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      throw new Error('Falha ao obter detalhes da assinatura de push do navegador');
    }

    // Salva a assinatura no backend
    await api.savePushSubscription({
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
    });

    // Feedback tátil de sucesso
    triggerHaptic([60, 40, 60]);

    return {
      success: true,
      message: 'Notificações ativadas com sucesso! Seu celular vibrará e emitirá alertas.',
    };
  } catch (error: any) {
    console.error('Erro ao inscrever notificações push:', error);
    return {
      success: false,
      message: error?.message || 'Falha ao ativar notificações push',
    };
  }
}

/**
 * Dispara uma notificação de teste imediata para o dispositivo
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.sendTestNotification();
    triggerHaptic([100, 50, 100]);
    return {
      success: true,
      message: res.message || 'Notificação de teste enviada!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Falha ao disparar notificação de teste',
    };
  }
}
