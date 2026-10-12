import 'dotenv/config';
import { prisma, DEFAULT_SYSTEM_COLUMNS } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';

async function main() {
  const args = process.argv.slice(2);

  const name = args[0] || process.env.USER_NAME || 'Administrador';
  const email = (args[1] || process.env.USER_EMAIL || 'admin@todo.com').toLowerCase().trim();
  const password = args[2] || process.env.USER_PASSWORD || 'admin123';

  console.log('======================================================');
  console.log('🔐 PROVISIONAMENTO DE USUÁRIO (ACESSO FECHADO VIA BANCO)');
  console.log('======================================================');
  console.log(`👤 Nome:     ${name}`);
  console.log(`✉️ E-mail:   ${email}`);
  console.log(`🔑 Senha:    ${password}`);
  console.log('------------------------------------------------------');

  try {
    const hashedPassword = await AuthService.hashPassword(password);

    // Cria ou atualiza o usuário no banco
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        password: hashedPassword,
      },
      create: {
        name,
        email,
        password: hashedPassword,
      },
    });

    console.log(`✅ Usuário provisionado com sucesso! (ID: ${user.id})`);

    // Cria as 3 colunas base para este usuário caso ainda não existam
    for (const col of DEFAULT_SYSTEM_COLUMNS) {
      const existing = await prisma.column.findFirst({
        where: { slug: col.slug, user_id: user.id },
      });
      if (!existing) {
        await prisma.column.create({
          data: {
            name: col.name,
            slug: col.slug,
            color: col.color,
            icon: col.icon,
            position: col.position,
            is_system: true,
            user_id: user.id,
          },
        });
      }
    }

    console.log('📁 Colunas essenciais vinculadas ao usuário com sucesso.');
    console.log('------------------------------------------------------');
    console.log('💡 DICA: Caso prefira rodar diretamente no SQL Editor do Supabase:');
    console.log(`
INSERT INTO users (id, name, email, password, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '${name}',
  '${email}',
  '${hashedPassword}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, name = EXCLUDED.name, updated_at = NOW();
    `);
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Erro ao criar usuário no banco:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
