import { RecurrenceRule } from '../types/task';

function normalizeDaysOfWeek(days: number[]): number[] {
  return days.map((d) => (d === 7 ? 0 : d)).filter((d) => d >= 0 && d <= 6);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

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
    const lastDayOfMonth = getDaysInMonth(year, month);
    const date = new Date(year, month, lastDayOfMonth, hours, minutes, 0, 0);
    const diff = (date.getDay() - normalizedWeekday + 7) % 7;
    date.setDate(date.getDate() - diff);
    return date;
  }

  const firstDay = new Date(year, month, 1, hours, minutes, 0, 0);
  const diff = (normalizedWeekday - firstDay.getDay() + 7) % 7;
  const targetDay = 1 + diff + (weekNumber - 1) * 7;

  return new Date(year, month, targetDay, hours, minutes, 0, 0);
}

export function calculateNextDueDate(
  rule: RecurrenceRule | null | undefined,
  fromDate?: Date | string | null
): Date | null {
  if (!rule || !rule.type) return null;

  const baseDate = fromDate ? new Date(fromDate) : new Date();
  if (isNaN(baseDate.getTime())) return null;

  const now = new Date();
  const interval = Math.max(1, Number(rule.interval) || 1);

  const hours = baseDate.getHours();
  const minutes = baseDate.getMinutes();
  const seconds = baseDate.getSeconds();

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
      const days =
        rule.days && Array.isArray(rule.days) && rule.days.length > 0
          ? normalizeDaysOfWeek(rule.days)
          : null;

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

      // 1. Modo: Enésima semana do mês (ex: 1ª semana na Segunda)
      if (
        rule.monthly_mode === 'nth_weekday' ||
        (!rule.monthly_mode && rule.week_number !== undefined && (rule.weekdays !== undefined || rule.weekday !== undefined))
      ) {
        const weekNum = Number(rule.week_number) || 1;

        const targetWeekdays =
          rule.weekdays && Array.isArray(rule.weekdays) && rule.weekdays.length > 0
            ? normalizeDaysOfWeek(rule.weekdays)
            : [Number(rule.weekday) !== undefined ? Number(rule.weekday) : 1];

        const candidatesThisMonth: Date[] = targetWeekdays
          .map((wd) =>
            getNthWeekdayOfMonth(candidateYear, candidateMonth, weekNum, wd, hours, minutes)
          )
          .sort((a, b) => a.getTime() - b.getTime());

        const nextInCurrentMonth = candidatesThisMonth.find((d) => d.getTime() > referenceTime);
        if (nextInCurrentMonth) {
          return nextInCurrentMonth;
        }

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

        const maxDaysThisMonth = getDaysInMonth(candidateYear, candidateMonth);
        const actualDayThisMonth = isLastDay ? maxDaysThisMonth : Math.min(targetDay, maxDaysThisMonth);
        const candidateThisMonth = new Date(candidateYear, candidateMonth, actualDayThisMonth, hours, minutes, seconds, 0);

        if (candidateThisMonth.getTime() > referenceTime) {
          return candidateThisMonth;
        }

        candidateMonth += interval;
        while (candidateMonth > 11) {
          candidateMonth -= 12;
          candidateYear += 1;
        }

        const maxDaysNextMonth = getDaysInMonth(candidateYear, candidateMonth);
        const actualDayNextMonth = isLastDay ? maxDaysNextMonth : Math.min(targetDay, maxDaysNextMonth);
        return new Date(candidateYear, candidateMonth, actualDayNextMonth, hours, minutes, seconds, 0);
      }

      const nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + interval);

      if (nextDate.getTime() <= referenceTime) {
        const todayBased = new Date(referenceTime);
        todayBased.setHours(hours, minutes, seconds, 0);
        todayBased.setDate(todayBased.getDate() + interval);
        return todayBased;
      }

      return nextDate;
    }

    default:
      return null;
  }
}

export function calculateNextNOccurrences(
  rule: RecurrenceRule | null | undefined,
  fromDate?: Date | string | null,
  count: number = 5
): Date[] {
  if (!rule || !rule.type) return [];

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
