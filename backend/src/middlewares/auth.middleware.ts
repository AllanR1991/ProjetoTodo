import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service.js';

// Estende a interface do Express Request para conter userId e user decodificados
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware de proteção de rotas.
 * Exige cabeçalho "Authorization: Bearer <token>" válido.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Acesso não autorizado. É necessário realizar login para continuar.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'Formato de token inválido. Esperado: Bearer <token>',
      code: 'INVALID_TOKEN_FORMAT',
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = AuthService.verifyToken(token);
    req.userId = payload.userId;
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Sessão expirada ou inválida. Por favor, faça login novamente.',
      code: 'SESSION_EXPIRED',
    });
  }
}

/**
 * Middleware opcional: se o token existir e for válido, associa o usuário ao request.
 * Não bloqueia se o token estiver ausente.
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const payload = AuthService.verifyToken(parts[1]);
      req.userId = payload.userId;
      req.user = payload;
    } catch {
      // Ignora erro e continua sem usuário associado
    }
  }

  next();
}

