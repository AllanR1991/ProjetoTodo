import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RealtimeService } from '../services/realtime.service.js';

export class RealtimeController {
  /**
   * Conexão SSE persistente em tempo real
   * GET /realtime/events?token=<jwt_token>
   */
  static streamEvents(req: Request, res: Response) {
    let token = (req.query.token as string) || '';

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    let userId = 'anonymous';

    if (token) {
      try {
        const payload = AuthService.verifyToken(token);
        userId = payload.userId;
      } catch {
        return res.status(401).json({ error: 'Token de autenticação inválido ou expirado' });
      }
    }

    // Registra conexão no gerenciador de eventos
    RealtimeService.addClient(userId, res);
  }

  static getStatus(req: Request, res: Response) {
    res.status(200).json({
      service: 'realtime-sse',
      activeConnections: RealtimeService.getConnectedClientsCount(),
    });
  }
}
