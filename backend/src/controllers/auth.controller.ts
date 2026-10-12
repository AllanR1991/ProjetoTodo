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
    } catch (error: any) {
      console.error('🚨 [LOGIN ERROR]', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      res.status(500).json({
        error: 'Erro interno ao realizar autenticação',
        details: error?.message || 'Falha de comunicação com o banco de dados',
      });
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

  /**
   * Endpoint para alteração de senha do usuário autenticado
   * POST /auth/change-password
   * Header: Authorization: Bearer <token>
   * Body: { currentPassword, newPassword }
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
        newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
      });

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: parsed.error.format(),
        });
        return;
      }

      const { currentPassword, newPassword } = parsed.data;

      // Busca o usuário logado para obter o hash atual
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Valida se a senha atual está correta com bcrypt
      const isCurrentValid = await AuthService.comparePassword(currentPassword, user.password);
      if (!isCurrentValid) {
        res.status(400).json({ error: 'A senha atual informada está incorreta.' });
        return;
      }

      // Gera novo hash seguro
      const hashedNewPassword = await AuthService.hashPassword(newPassword);

      // Atualiza no banco
      await prisma.user.update({
        where: { id: req.userId },
        data: { password: hashedNewPassword },
      });

      res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ error: 'Erro interno ao processar a troca de senha' });
    }
  },
};
