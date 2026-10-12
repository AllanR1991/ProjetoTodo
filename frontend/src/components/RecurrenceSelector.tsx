import React, { useState, useMemo } from 'react';
import { Repeat, Code, CalendarDays, CalendarCheck2 } from 'lucide-react';
import { RecurrenceRule, MonthlyMode } from '../types/task';
import { calculateNextNOccurrences } from '../utils/recurrence';

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({ value, onChange }) => {
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const next5Dates = useMemo(() => {
    if (!value || !value.type) return [];
    return calculateNextNOccurrences(value, new Date(), 5);
  }, [value]);

  const daysOfWeek = [
    { id: 0, label: 'D', full: 'Domingo' },
    { id: 1, label: 'S', full: 'Segunda' },
    { id: 2, label: 'T', full: 'Terça' },
    { id: 3, label: 'Q', full: 'Quarta' },
    { id: 4, label: 'Q', full: 'Quinta' },
    { id: 5, label: 'S', full: 'Sexta' },
    { id: 6, label: 'S', full: 'Sábado' },
  ];

  const weekOrdinals = [
    { id: 1, label: '1ª semana (Primeira)' },
    { id: 2, label: '2ª semana (Segunda)' },
    { id: 3, label: '3ª semana (Terceira)' },
    { id: 4, label: '4ª semana (Quarta)' },
    { id: -1, label: 'Última semana' },
  ];

  const currentType = value?.type || 'none';
  const currentDays = value?.days || [];
  const currentMonthlyMode: MonthlyMode = value?.monthly_mode || 'day_of_month';
  const currentDayOfMonth = value?.day_of_month !== undefined ? value.day_of_month : new Date().getDate();
  const currentWeekNumber = value?.week_number !== undefined ? value.week_number : 1;
  const currentMonthlyWeekdays: number[] =
    value?.weekdays && value.weekdays.length > 0
      ? value.weekdays
      : value?.weekday !== undefined
      ? [value.weekday]
      : [1]; // 1 = Segunda-feira como padrão natural

  const handlePresetChange = (preset: string) => {
    switch (preset) {
      case 'none':
        onChange(null);
        break;
      case 'daily':
        onChange({ type: 'daily', interval: 1 });
        break;
      case 'workdays':
        onChange({ type: 'weekly', days: [1, 2, 3, 4, 5], interval: 1 });
        break;
      case 'weekly':
        onChange({
          type: 'weekly',
          days: currentDays.length > 0 ? currentDays : [new Date().getDay()],
          interval: 1,
        });
        break;
      case 'monthly':
        onChange({
          type: 'monthly',
          monthly_mode: 'day_of_month',
          day_of_month: Math.min(28, new Date().getDate()),
          interval: 1,
        });
        break;
    }
  };

  const toggleDay = (dayId: number) => {
    let newDays: number[];
    if (currentDays.includes(dayId)) {
      newDays = currentDays.filter((d) => d !== dayId);
    } else {
      newDays = [...currentDays, dayId].sort((a, b) => a - b);
    }
    if (newDays.length === 0) newDays = [dayId];

    onChange({
      type: 'weekly',
      days: newDays,
      interval: value?.interval || 1,
    });
  };

  const toggleMonthlyWeekday = (dayId: number) => {
    let newDays: number[];
    if (currentMonthlyWeekdays.includes(dayId)) {
      if (currentMonthlyWeekdays.length === 1) {
        newDays = [dayId]; // mantém ao menos um selecionado
      } else {
        newDays = currentMonthlyWeekdays.filter((d) => d !== dayId);
      }
    } else {
      newDays = [...currentMonthlyWeekdays, dayId].sort((a, b) => a - b);
    }

    updateMonthly({
      weekdays: newDays,
      weekday: newDays[0],
    });
  };

  const updateMonthly = (updates: Partial<RecurrenceRule>) => {
    const targetMode = updates.monthly_mode || currentMonthlyMode;
    const baseRule: RecurrenceRule = {
      type: 'monthly',
      monthly_mode: targetMode,
      interval: value?.interval || 1,
    };

    if (targetMode === 'day_of_month') {
      baseRule.day_of_month =
        updates.day_of_month !== undefined ? updates.day_of_month : currentDayOfMonth;
    } else {
      baseRule.week_number =
        updates.week_number !== undefined ? updates.week_number : currentWeekNumber;
      const targetDays = updates.weekdays !== undefined ? updates.weekdays : currentMonthlyWeekdays;
      baseRule.weekdays = targetDays;
      baseRule.weekday = targetDays[0] ?? 1;
    }

    onChange({
      ...baseRule,
      ...updates,
    });
  };

  return (
    <div className="space-y-3.5 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <Repeat className="w-3.5 h-3.5 text-blue-600" />
          <span>Regra de Recorrência (Repetição)</span>
        </label>
        <button
          type="button"
          onClick={() => setShowJsonRaw(!showJsonRaw)}
          className="text-[11px] text-gray-400 hover:text-blue-600 flex items-center gap-1"
          title="Ver payload JSON do banco"
        >
          <Code className="w-3 h-3" />
          <span>{showJsonRaw ? 'Ocultar JSON' : 'Ver JSON'}</span>
        </button>
      </div>

      {/* Select Principal */}
      <select
        value={
          !value
            ? 'none'
            : value.type === 'weekly' &&
              JSON.stringify(value.days) === JSON.stringify([1, 2, 3, 4, 5])
            ? 'workdays'
            : value.type
        }
        onChange={(e) => handlePresetChange(e.target.value)}
        className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
      >
        <option value="none">Não repetir</option>
        <option value="daily">Diariamente (Todos os dias)</option>
        <option value="workdays">Dias úteis (Segunda a Sexta)</option>
        <option value="weekly">Semanalmente (Escolher dias)</option>
        <option value="monthly">Mensalmente (Dia fixo ou semana do mês)</option>
      </select>

      {/* Opções Semanais */}
      {currentType === 'weekly' && (
        <div className="pt-1">
          <span className="text-[11px] font-medium text-gray-500 mb-1.5 block">
            Repetir nos dias da semana:
          </span>
          <div className="grid grid-cols-7 gap-1">
            {daysOfWeek.map((day) => {
              const isSelected = currentDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={day.full}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Opções Mensais Avançadas */}
      {currentType === 'monthly' && (
        <div className="pt-1 space-y-2.5 bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span>Configuração Mensal:</span>
          </div>

          {/* Opção 1: Dia Fixo do Mês */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
            <input
              type="radio"
              name="monthlyMode"
              checked={currentMonthlyMode === 'day_of_month'}
              onChange={() => updateMonthly({ monthly_mode: 'day_of_month' })}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">No mesmo dia todo mês</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                  Dias 1 a 28 seguros
                </span>
              </div>

              {currentMonthlyMode === 'day_of_month' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Todo dia:</span>
                    {currentDayOfMonth === -1 ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg">
                        Último dia do mês
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={currentDayOfMonth}
                        onChange={(e) =>
                          updateMonthly({
                            day_of_month: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                          })
                        }
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-lg font-bold text-center focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateMonthly({
                          day_of_month: currentDayOfMonth === -1 ? 15 : -1,
                        })
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        currentDayOfMonth === -1
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {currentDayOfMonth === -1 ? 'Definir dia numérico' : 'Ou no último dia do mês'}
                    </button>
                  </div>

                  {/* Dica de Engenharia / Experiência do Usuário */}
                  {currentDayOfMonth > 28 && currentDayOfMonth !== -1 ? (
                    <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-lg text-[10px] text-amber-800 leading-tight">
                      ℹ️ <strong>Atenção:</strong> Fevereiro tem 28 dias (29 em bissextos). Nos meses com menos dias, o sistema ajustará automaticamente para o último dia válido daquele mês.
                    </div>
                  ) : currentDayOfMonth <= 28 && currentDayOfMonth > 0 ? (
                    <div className="text-[10px] text-gray-400">
                      ✓ O dia {currentDayOfMonth} existe em absolutamente todos os 12 meses do ano.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </label>

          {/* Opção 2: N-ésima semana do mês com suporte a múltiplos dias */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700 pt-2 border-t border-gray-100">
            <input
              type="radio"
              name="monthlyMode"
              checked={currentMonthlyMode === 'nth_weekday'}
              onChange={() => updateMonthly({ monthly_mode: 'nth_weekday' })}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 space-y-2">
              <span className="font-semibold text-gray-800 block">Pela semana do mês (ex: 2ª semana nas Terças e Quintas)</span>
              {currentMonthlyMode === 'nth_weekday' && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-1">Qual semana do mês?</label>
                    <select
                      value={currentWeekNumber}
                      onChange={(e) => updateMonthly({ week_number: Number(e.target.value) })}
                      className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 focus:ring-1 focus:ring-blue-500"
                    >
                      {weekOrdinals.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          {ord.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-500 font-semibold">
                        Dias dessa semana:
                      </label>
                      <span className="text-[10px] text-blue-600 font-medium">
                        {currentMonthlyWeekdays.map((d) => daysOfWeek[d]?.label).join(', ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {daysOfWeek.map((day) => {
                        const isSelected = currentMonthlyWeekdays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleMonthlyWeekday(day.id)}
                            className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                            title={day.full}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Previsão das Próximas 5 Ocorrências */}
      {next5Dates.length > 0 && (
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <CalendarCheck2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Próximas 5 Ocorrências:</span>
          </div>

          <div className="space-y-1">
            {next5Dates.map((date, idx) => {
              const formattedDate = date.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-blue-100 text-[11px] shadow-2xs"
                >
                  <span className="font-semibold text-gray-800">
                    <span className="text-blue-600 font-bold mr-1.5">{idx + 1}ª:</span>
                    <span className="capitalize">{formattedDate}</span>
                  </span>
                  <span className="text-[10px] text-blue-600/80 font-medium">
                    {idx === 0 ? 'Próxima' : `+${idx} ciclo`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visualização de Depuração / Payload JSON da entidade Task */}
      {showJsonRaw && (
        <div className="mt-2 p-2 bg-gray-900 text-gray-200 rounded text-[11px] font-mono overflow-x-auto">
          <pre>{JSON.stringify(value, null, 2) || 'null'}</pre>
        </div>
      )}
    </div>
  );
};
