// Service Worker customizado para Web Push Notifications e Vibração
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notificação', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Notificação de Tarefas';
  const options = {
    body: data.body || 'Você tem uma atualização nas suas tarefas.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    // Padrão de vibração perceptível: vibra 250ms, pausa 100ms, vibra 250ms
    vibrate: data.vibrate || [250, 100, 250, 100, 250],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      ...data.data,
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
      },
    ],
    tag: data.tag || 'todo-push-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se o app já estiver aberto em alguma aba ou janela standalone, foca nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (client.url !== targetUrl && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se não estiver aberto, abre a janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
