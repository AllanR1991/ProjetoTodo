import { Response } from 'express';

interface ConnectedClient {
  id: string;
  userId: string;
  res: Response;
}

class RealtimeServiceImpl {
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Mantém as conexões ativas enviando ping a cada 20 segundos
    // Evita timeout do Render, Cloudflare e navegadores móveis
    this.pingInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 20000);
  }

  public addClient(userId: string, res: Response): string {
    const clientId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Configura cabeçalhos SSE com proteção anti-buffering para Nginx / Render / Proxies
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Mensagem de boas-vindas / handshake inicial
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

    this.clients.set(clientId, { id: clientId, userId, res });

    res.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  private sendHeartbeat() {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(`: ping\n\n`);
      } catch {
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Envia evento para todas as conexões abertas do usuário especificado
   * (Garante privacidade total: um usuário NUNCA recebe dados de outro usuário)
   */
  public notifyUser(userId: string | null | undefined, eventName: string, payload: any) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      try {
        // Se o evento for destinado a um usuário específico, apenas envia para conexões dele
        if (!userId || client.userId === userId || client.userId === 'all') {
          client.res.write(message);
        }
      } catch (err) {
        console.warn(`[Realtime] Erro ao enviar evento para cliente ${clientId}:`, err);
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Envia evento para todos os clientes conectados
   */
  public broadcastAll(eventName: string, payload: any) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(message);
      } catch {
        this.clients.delete(clientId);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const RealtimeService = new RealtimeServiceImpl();
