import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const AuthController = {
  /**
   * Endpoint de login
   * POST /auth/login
   * Body: { email, password }
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: parsed.error.format(),
        });
        return;
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Busca o usuário no banco
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // Proteção contra enumeração de usuários: se o usuário não existir,
      // executa uma verificação simulada para manter o tempo de resposta semelhante
      if (!user) {
        await AuthService.comparePassword(password, '$2a$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZabcdefghijklmnopqr');
        res.status(401).json({
          error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        });
        return;
      }

      // Valida a senha com bcrypt
      const isPasswordValid = await AuthService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        });
        return;
      }

      // Gera o token JWT com validade de 7 dias
      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      res.status(200).json({
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Erro ao processar login:', error);
      res.status(500).json({ error: 'Erro interno ao realizar autenticação' });
    }
  },

  /**
   * Endpoint para obter os dados do usuário logado
   * GET /auth/me
   * Header: Authorization: Bearer <token>
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          created_at: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },
};
