import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'todo-app-jwt-secret-key-production-change-2026';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export const AuthService = {
  /**
   * Gera o hash seguro de uma senha usando bcrypt com salt 10
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  },

  /**
   * Compara uma senha em texto puro com o hash salvo no banco
   */
  async comparePassword(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
  },

  /**
   * Gera um token JWT assinado para a sessão do usuário
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  },

  /**
   * Valida e decodifica um token JWT
   */
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  },
};
