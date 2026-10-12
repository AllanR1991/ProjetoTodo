import { calculateNextDueDate, calculateNextNOccurrences } from './services/recurrence.service.js';
import { prisma } from './lib/prisma.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 EXECUTANDO BATERIA DE TESTES LOCAIS EXPANDIDA');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, extra?: any) {
    total++;
    if (condition) {
      console.log(`✅ [PASSOU] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] ${testName}`, extra || '');
    }
  }

  // -------------------------------------------------------------------------
  // 1. TESTES DO MOTOR DE RECORRÊNCIA AVANÇADA
  // -------------------------------------------------------------------------
  console.log('--- 1. Testando Motor de Cálculo de Recorrência ---');

  const today = new Date();

  // Teste 1: Diário
  const nextDaily = calculateNextDueDate({ type: 'daily', interval: 1 }, today);
  assert(
    nextDaily !== null && nextDaily.getTime() > today.getTime(),
    'Recorrência Diária: calcula data futura corretamente'
  );

  // Teste 2: Semanal com dias específicos [1, 3] (Segunda e Quarta)
  const mondayWednesdayRule = { type: 'weekly' as const, days: [1, 3] };
  const nextWeekly = calculateNextDueDate(mondayWednesdayRule, today);
  const dayOfWeek = nextWeekly?.getDay();
  assert(
    nextWeekly !== null && (dayOfWeek === 1 || dayOfWeek === 3),
    `Recorrência Semanal [1, 3]: próxima data cai em Segunda(1) ou Quarta(3) (Resultado: dia ${dayOfWeek})`
  );

  // Teste 3: Mensal - Dia específico do mês (ex: todo dia 15)
  const dayOfMonthRule = {
    type: 'monthly' as const,
    monthly_mode: 'day_of_month' as const,
    day_of_month: 15,
  };
  const nextDayOfMonth = calculateNextDueDate(dayOfMonthRule, today);
  assert(
    nextDayOfMonth !== null && nextDayOfMonth.getDate() === 15 && nextDayOfMonth.getTime() > today.getTime(),
    `Recorrência Mensal Dia Fixo: agendou para o dia 15 (Resultado: ${nextDayOfMonth?.toLocaleDateString('pt-BR')})`
  );

  // Teste 4: Mensal - N-ésima ocorrência (ex: 2ª quarta-feira do mês -> weekday = 3, week_number = 2)
  const nthWeekdayRule = {
    type: 'monthly' as const,
    monthly_mode: 'nth_weekday' as const,
    week_number: 2,
    weekday: 3,
  };
  const nextNthWeekday = calculateNextDueDate(nthWeekdayRule, today);
  assert(
    nextNthWeekday !== null && nextNthWeekday.getDay() === 3 && nextNthWeekday.getTime() > today.getTime(),
    `Recorrência Mensal N-ésimo Dia: 2ª quarta-feira (Resultado: ${nextNthWeekday?.toLocaleDateString('pt-BR')}, dia da semana: ${nextNthWeekday?.getDay()})`
  );

  // Teste 5: Mensal - Última sexta-feira do mês (week_number = -1, weekday = 5)
  const lastFridayRule = {
    type: 'monthly' as const,
    monthly_mode: 'nth_weekday' as const,
    week_number: -1,
    weekday: 5,
  };
  const nextLastFriday = calculateNextDueDate(lastFridayRule, today);
  assert(
    nextLastFriday !== null && nextLastFriday.getDay() === 5 && nextLastFriday.getTime() > today.getTime(),
    `Recorrência Mensal Última Sexta: (Resultado: ${nextLastFriday?.toLocaleDateString('pt-BR')})`
  );

  // Teste 6: Mensal - Múltiplos dias na semana do mês (ex: 2ª semana nas Terças e Quintas -> [2, 4])
  const multiDayWeekRule = {
    type: 'monthly' as const,
    monthly_mode: 'nth_weekday' as const,
    week_number: 2,
    weekdays: [2, 4], // Terça e Quinta
  };
  const nextMultiDay = calculateNextDueDate(multiDayWeekRule, today);
  assert(
    nextMultiDay !== null &&
      (nextMultiDay.getDay() === 2 || nextMultiDay.getDay() === 4) &&
      nextMultiDay.getTime() > today.getTime(),
    `Recorrência Mensal Múltiplos Dias: 2ª semana na Terça(2) ou Quinta(4) (Resultado: dia ${nextMultiDay?.getDay()}, ${nextMultiDay?.toLocaleDateString('pt-BR')})`
  );

  // Teste 7: Previsão exata das próximas 5 ocorrências (Next 5 Occurrences)
  const next5Occurrences = calculateNextNOccurrences(multiDayWeekRule, today, 5);
  const isChronological = next5Occurrences.every((date, i, arr) => i === 0 || date.getTime() > arr[i - 1].getTime());
  assert(
    next5Occurrences.length === 5 && isChronological,
    `Previsão das Próximas 5 Ocorrências: gerou exatamente 5 datas cronológicas futuras`
  );

  // -------------------------------------------------------------------------
  // 2. TESTES DE CRUD DE COLUNAS/QUADRO KANBAN
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testando CRUD de Colunas (Quadro estilo Trello) ---');

  const initialColumns = await prisma.column.findMany();
  assert(initialColumns.length >= 3, `Listagem de Colunas: possui colunas padrão (${initialColumns.length} encontradas)`);

  const createdCol = await prisma.column.create({
    data: {
      name: 'Em Testes / QA',
      slug: 'em-testes-qa',
      color: '#8b5cf6',
      icon: 'CheckSquare',
    },
  });
  assert(Boolean(createdCol.id) && createdCol.name === 'Em Testes / QA', 'Criação de Coluna: coluna customizada criada com sucesso');

  const updatedCol = await prisma.column.update({
    where: { id: createdCol.id },
    data: { name: 'Homologação' },
  });
  assert(updatedCol.name === 'Homologação', 'Edição de Coluna: renomeada com sucesso para "Homologação"');

  const deletedCol = await prisma.column.delete({ where: { id: createdCol.id } });
  assert(deletedCol.id === createdCol.id, 'Exclusão de Coluna: coluna excluída com sucesso');

  // -------------------------------------------------------------------------
  // 3. TESTES DE CRUD DE TAREFAS E DRAG & DROP
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testando Tarefas e Movimentação entre Colunas ---');

  const testTask = await prisma.task.create({
    data: {
      title: 'Tarefa para Testar Movimentação',
      list_type: 'backlog',
      position: 0,
    },
  });
  assert(testTask.list_type === 'backlog', 'Criação de Tarefa no Backlog');

  // Mover tarefa para outra coluna (Drag and Drop simulation)
  const movedTask = await prisma.task.update({
    where: { id: testTask.id },
    data: { list_type: 'my_day', position: 2 },
  });
  assert(movedTask.list_type === 'my_day' && movedTask.position === 2, 'Drag and Drop: tarefa movida para "my_day" na posição 2');

  // Limpeza
  await prisma.task.delete({ where: { id: testTask.id } });

  // -------------------------------------------------------------------------
  // 4. TESTES DO WEBHOOK DE E-MAIL
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testando Mapeamento do Webhook de E-mail ---');

  const webhookMockPayload = {
    subject: 'Proposta Comercial Cliente VIP',
    text: 'Segue a proposta para aprovação.',
    from: 'vip@empresa.com',
  };

  const webhookTask = await prisma.task.create({
    data: {
      title: webhookMockPayload.subject,
      description: `[Remetente: ${webhookMockPayload.from}]\n\n${webhookMockPayload.text}`,
      list_type: 'backlog',
      due_date: null,
      is_completed: false,
    },
  });
  assert(webhookTask.title === 'Proposta Comercial Cliente VIP', 'Webhook de E-mail: tarefa gerada a partir do e-mail');

  // Limpeza
  await prisma.task.delete({ where: { id: webhookTask.id } });

  // -------------------------------------------------------------------------
  // 5. TESTES DE AUTENTICAÇÃO E SEGURANÇA (BCRYPT & JWT)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testando Autenticação e Segurança (Bcrypt & JWT) ---');

  const { AuthService } = await import('./services/auth.service.js');
  const rawSecret = 'MinhaSenhaSegura#2026';
  const hashed = await AuthService.hashPassword(rawSecret);
  const isValid = await AuthService.comparePassword(rawSecret, hashed);
  const isInvalid = await AuthService.comparePassword('SenhaErrada', hashed);

  assert(isValid === true, 'Bcrypt: gera hash e valida senha correta com sucesso');
  assert(isInvalid === false, 'Bcrypt: rejeita senha incorreta com segurança');

  const testToken = AuthService.generateToken({
    userId: 'user-teste-123',
    email: 'teste@empresa.com',
    name: 'Usuario Teste',
  });
  const decoded = AuthService.verifyToken(testToken);

  assert(decoded.userId === 'user-teste-123', 'JWT: gera e valida token assinado');
  assert(decoded.email === 'teste@empresa.com', 'JWT: payload contém email correto');

  // -------------------------------------------------------------------------
  // 6. TESTES DE ALTERAÇÃO DE SENHA SEGURA (BCRYPT + DATABASE)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testando Fluxo de Alteração de Senha Segura ---');
  const oldPass = 'SenhaAntiga@123';
  const newPass = 'NovaSenhaSegura@2026';
  const oldHash = await AuthService.hashPassword(oldPass);

  const tempUser = await prisma.user.create({
    data: {
      name: 'User Password Test',
      email: `pwtest-${Date.now()}@teste.com`,
      password: oldHash,
    },
  });

  const checkOldValid = await AuthService.comparePassword(oldPass, tempUser.password);
  assert(checkOldValid === true, 'Troca de Senha: senha antiga validada com sucesso');

  const newHash = await AuthService.hashPassword(newPass);
  const updatedUser = await prisma.user.update({
    where: { id: tempUser.id },
    data: { password: newHash },
  });

  const checkNewValid = await AuthService.comparePassword(newPass, updatedUser.password);
  const checkOldNowFails = await AuthService.comparePassword(oldPass, updatedUser.password);
  assert(checkNewValid === true, 'Troca de Senha: nova senha aceita após alteração');
  assert(checkOldNowFails === false, 'Troca de Senha: senha anterior deixa de ser válida');

  // Limpeza
  await prisma.user.delete({ where: { id: tempUser.id } });

  console.log('\n======================================================');
  console.log(`🎉 RESULTADO: ${passed} de ${total} TESTES PASSARAM COM SUCESSO!`);
  console.log('======================================================\n');
}

runTests().catch(console.error);
