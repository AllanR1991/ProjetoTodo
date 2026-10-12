import 'dotenv/config';
import { createApp } from './app.js';
import { prisma, ensureDefaultColumnsExist } from './lib/prisma.js';

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor To-Do API rodando com sucesso na porta ${PORT}`);
  console.log(`📡 Healthcheck disponível em http://localhost:${PORT}/health`);
  console.log(`📋 Tasks endpoint em http://localhost:${PORT}/tasks`);
  console.log(`✉️ Webhook de e-mail em http://localhost:${PORT}/webhooks/incoming-email`);

  // Garante que as colunas padrão existam no banco
  await ensureDefaultColumnsExist();
});

// Encerramento limpo de conexões com o banco de dados
async function gracefulShutdown(signal: string) {
  console.log(`\nRecebido sinal ${signal}. Encerrando servidor e conexões...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Conexão com Prisma / PostgreSQL finalizada com sucesso.');
      process.exit(0);
    } catch (err) {
      console.error('Erro ao desconectar Prisma:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
