import React, { useState } from 'react';
import { Plus, Calendar, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { ListType, RecurrenceRule } from '../types/task';

interface QuickAddTaskProps {
  currentList: ListType;
  onAddTask: (title: string, listType: ListType, dueDate?: string | null, recurrence?: RecurrenceRule | null) => Promise<void>;
  onOpenFullCreate?: () => void;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({
  currentList,
  onAddTask,
  onOpenFullCreate,
}) => {
  const [title, setTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const targetList = currentList;
      await onAddTask(
        title.trim(),
        targetList,
        dueDate ? new Date(dueDate).toISOString() : null,
        null
      );
      setTitle('');
      setDueDate('');
      setIsFocused(false);
    } catch (error) {
      console.error('Falha ao adicionar tarefa rápida:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative bg-white rounded-xl border transition-all duration-200 shadow-xs ${
        isFocused
          ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
          : 'border-gray-200/80 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center px-4 py-3 gap-3">
        <button
          type="submit"
          disabled={!title.trim() || isLoading}
          className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all ${
            title.trim()
              ? 'border-blue-600 bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
              : 'border-gray-300 text-gray-400 cursor-default'
          }`}
          title="Adicionar tarefa"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={`Adicionar uma tarefa em ${
            currentList === 'my_day' ? 'Meu Dia' : currentList === 'planned' ? 'Planejadas' : 'Backlog'
          }... (Pressione Enter)`}
          className="flex-1 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-medium"
        />

        <div className="flex items-center gap-1.5">
          {onOpenFullCreate && (
            <button
              type="button"
              onClick={onOpenFullCreate}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Abrir formulário com todos os campos (descrição, subtarefas, repetição)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline text-blue-600">Mais Detalhes</span>
            </button>
          )}

          {title.trim() && (
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              Adicionar
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isFocused && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-blue-400 transition-colors shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-gray-700 font-medium cursor-pointer"
                title="Data de conclusão"
              />
            </div>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-[11px] text-gray-400 hover:text-red-500 underline"
              >
                Limpar data
              </button>
            )}
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">Pressione Enter para salvar direto</span>
        </div>
      )}
    </form>
  );
};
