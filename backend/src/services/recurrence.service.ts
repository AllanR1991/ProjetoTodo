import { RecurrenceRule } from '../types/task.js';

/**
 * Normaliza dias da semana para o padrão JavaScript:
 * 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado.
 */
function normalizeDaysOfWeek(days: number[]): number[] {
  return days.map((d) => (d === 7 ? 0 : d)).filter((d) => d >= 0 && d <= 6);
}

/**
 * Retorna o número de dias em um determinado mês/ano.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Encontra a N-ésima ocorrência de um dia da semana em determinado mês e ano.
 * Ex: 2ª quarta-feira do mês (weekNumber = 2, weekday = 3)
 * Ou última sexta-feira do mês (weekNumber = -1, weekday = 5)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekNumber: number,
  weekday: number,
  hours: number = 9,
  minutes: number = 0
): Date {
  const normalizedWeekday = weekday === 7 ? 0 : weekday;

  if (weekNumber === -1) {
    // Última ocorrência no mês
    const lastDayOfMonth = getDaysInMonth(year, month);
    const date = new Date(year, month, lastDayOfMonth, hours, minutes, 0, 0);
    const diff = (date.getDay() - normalizedWeekday + 7) % 7;
    date.setDate(date.getDate() - diff);
    return date;
  }

  // 1ª a 4ª ocorrência
  const firstDay = new Date(year, month, 1, hours, minutes, 0, 0);
  const diff = (normalizedWeekday - firstDay.getDay() + 7) % 7;
  const targetDay = 1 + diff + (weekNumber - 1) * 7;

  return new Date(year, month, targetDay, hours, minutes, 0, 0);
}

/**
 * Calcula a próxima data válida para uma tarefa com base na regra de recorrência
 * 
 * @param rule Objeto com as regras de recorrência
 * @param fromDate Data de referência base (due_date anterior ou data atual)
 * @returns Nova data de vencimento calculada ou null caso a regra seja inválida
 */
export function calculateNextDueDate(
  rule: RecurrenceRule | null | undefined,
  fromDate?: Date | string | null
): Date | null {
  if (!rule || !rule.type) {
    return null;
  }

  const baseDate = fromDate ? new Date(fromDate) : new Date();
  if (isNaN(baseDate.getTime())) {
    return null;
  }

  const now = new Date();
  const interval = Math.max(1, Number(rule.interval) || 1);

  const hours = baseDate.getHours();
  const minutes = baseDate.getMinutes();
  const seconds = baseDate.getSeconds();

  // Ponto no tempo estritamente à frente do qual a próxima ocorrência deve estar
  const referenceTime = Math.max(now.getTime(), baseDate.getTime());

  switch (rule.type.toLowerCase()) {
    case 'daily': {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + interval);

      if (nextDate.getTime() <= referenceTime) {
        const nextFromRef = new Date(referenceTime);
        nextFromRef.setHours(hours, minutes, seconds, 0);
        nextFromRef.setDate(nextFromRef.getDate() + interval);
        return nextFromRef;
      }

      return nextDate;
    }

    case 'weekly': {
      const days = rule.days && Array.isArray(rule.days) && rule.days.length > 0
        ? normalizeDaysOfWeek(rule.days)
        : null;

      // Sem dias específicos, adiciona N semanas
      if (!days || days.length === 0) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + 7 * interval);
        if (nextDate.getTime() <= referenceTime) {
          nextDate.setTime(referenceTime + 7 * interval * 86400000);
        }
        return nextDate;
      }

      const startRef = new Date(referenceTime);
      const candidate = new Date(startRef);
      candidate.setHours(hours, minutes, seconds, 0);

      for (let offset = 1; offset <= 365; offset++) {
        const nextDay = new Date(candidate);
        nextDay.setDate(candidate.getDate() + offset);

        const currentDayOfWeek = nextDay.getDay();

        if (days.includes(currentDayOfWeek)) {
          if (nextDay.getTime() > referenceTime) {
            return nextDay;
          }
        }
      }

      const fallback = new Date(referenceTime);
      fallback.setDate(fallback.getDate() + 7);
      return fallback;
    }

    case 'monthly': {
      const startRef = new Date(referenceTime);
      let candidateYear = startRef.getFullYear();
      let candidateMonth = startRef.getMonth();

      // 1. Modo: Enésima semana do mês com um ou múltiplos dias da semana
      if (
        rule.monthly_mode === 'nth_weekday' ||
        (!rule.monthly_mode && rule.week_number !== undefined && (rule.weekdays !== undefined || rule.weekday !== undefined))
      ) {
        const weekNum = Number(rule.week_number) || 1; // 1, 2, 3, 4 ou -1

        const targetWeekdays =
          rule.weekdays && Array.isArray(rule.weekdays) && rule.weekdays.length > 0
            ? normalizeDaysOfWeek(rule.weekdays)
            : [Number(rule.weekday) !== undefined ? Number(rule.weekday) : 1];

        // 1. Testa todas as datas na semana especificada do mês de referência
        const candidatesThisMonth: Date[] = targetWeekdays
          .map((wd) =>
            getNthWeekdayOfMonth(candidateYear, candidateMonth, weekNum, wd, hours, minutes)
          )
          .sort((a, b) => a.getTime() - b.getTime());

        const nextInCurrentMonth = candidatesThisMonth.find((d) => d.getTime() > referenceTime);
        if (nextInCurrentMonth) {
          return nextInCurrentMonth;
        }

        // 2. Se já passaram todas as datas do mês atual, avança N meses
        candidateMonth += interval;
        while (candidateMonth > 11) {
          candidateMonth -= 12;
          candidateYear += 1;
        }

        const candidatesNextMonth: Date[] = targetWeekdays
          .map((wd) =>
            getNthWeekdayOfMonth(candidateYear, candidateMonth, weekNum, wd, hours, minutes)
          )
          .sort((a, b) => a.getTime() - b.getTime());

        return candidatesNextMonth[0];
      }

      // 2. Modo: Dia específico do mês (ex: todo dia 15 ou último dia do mês [-1])
      if (rule.monthly_mode === 'day_of_month' || rule.day_of_month !== undefined) {
        const rawDay = Number(rule.day_of_month);
        const isLastDay = rawDay === -1;
        const targetDay = isLastDay ? -1 : Math.min(31, Math.max(1, rawDay || baseDate.getDate()));

        // Testa o mês de referência primeiro
        const maxDaysThisMonth = getDaysInMonth(candidateYear, candidateMonth);
        const actualDayThisMonth = isLastDay ? maxDaysThisMonth : Math.min(targetDay, maxDaysThisMonth);
        const candidateThisMonth = new Date(candidateYear, candidateMonth, actualDayThisMonth, hours, minutes, seconds, 0);

        if (candidateThisMonth.getTime() > referenceTime) {
          return candidateThisMonth;
        }

        // Caso contrário, avança N meses
        candidateMonth += interval;
        while (candidateMonth > 11) {
          candidateMonth -= 12;
          candidateYear += 1;
        }

        const maxDaysNextMonth = getDaysInMonth(candidateYear, candidateMonth);
        const actualDayNextMonth = isLastDay ? maxDaysNextMonth : Math.min(targetDay, maxDaysNextMonth);
        return new Date(candidateYear, candidateMonth, actualDayNextMonth, hours, minutes, seconds, 0);
      }

      // 3. Fallback mensal padrão: adiciona interval meses preservando o dia
      const nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + interval);

      if (nextDate.getTime() <= referenceTime) {
        const todayBased = new Date(referenceTime);
        todayBased.setHours(hours, minutes, seconds, 0);
        todayBased.setMonth(todayBased.getMonth() + interval);
        return todayBased;
      }

      return nextDate;
    }

    case 'custom': {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + interval);
      return nextDate;
    }

    default:
      return null;
  }
}

/**
 * Calcula a lista das próximas N ocorrências com base na regra de recorrência
 * 
 * @param rule Objeto com as regras de recorrência
 * @param fromDate Data base inicial
 * @param count Quantidade de ocorrências futuras desejadas (default: 5)
 * @returns Array com as próximas N datas calculadas
 */
export function calculateNextNOccurrences(
  rule: RecurrenceRule | null | undefined,
  fromDate?: Date | string | null,
  count: number = 5
): Date[] {
  if (!rule || !rule.type) {
    return [];
  }

  const occurrences: Date[] = [];
  let currentRef: Date | string | null = fromDate || new Date();

  for (let i = 0; i < count; i++) {
    const next = calculateNextDueDate(rule, currentRef);
    if (!next) break;

    occurrences.push(next);
    currentRef = next;
  }

  return occurrences;
}
