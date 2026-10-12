import React from 'react';
import { Check, Calendar, Repeat, ChevronRight, Trash2, CheckSquare } from 'lucide-react';
import { Task } from '../types/task';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  onDeleteTask?: (taskId: string, taskTitle?: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isSelected,
  onSelect,
  onToggleComplete,
  onDeleteTask,
}) => {
  // Formatação de data amigável
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) return { label: 'Hoje', isOverdue: false, isToday: true };
    if (diffDays === 1) return { label: 'Amanhã', isOverdue: false, isToday: false };
    if (diffDays < 0) return { label: `Atrasada (${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`, isOverdue: true, isToday: false };

    return {
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      isOverdue: false,
      isToday: false,
    };
  };

  const dueInfo = formatDueDate(task.due_date);

  const getRecurrenceLabel = () => {
    if (!task.recurrence_rule) return null;
    const { type, days } = task.recurrence_rule;
    if (type === 'daily') return 'Diário';
    if (type === 'weekly') {
      if (days && days.length > 0) {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return days.map((d) => dayNames[d] || d).join(', ');
      }
      return 'Semanal';
    }
    if (type === 'monthly') return 'Mensal';
    return 'Recorrente';
  };

  const recurrenceLabel = getRecurrenceLabel();

  return (
    <div
      onClick={() => onSelect(task)}
      className={`group flex items-start gap-3.5 px-4 py-3 bg-white rounded-xl border transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-blue-500 shadow-sm ring-1 ring-blue-500 bg-blue-50/20'
          : 'border-gray-200/90 hover:border-gray-300 hover:shadow-xs'
      } ${task.is_completed ? 'opacity-65 bg-gray-50/50' : ''}`}
    >
      {/* Checkbox redonda estilo Microsoft To Do */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task, e);
        }}
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
          task.is_completed
            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 text-transparent'
        }`}
        title={task.is_completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
      >
        <Check className={`w-3.5 h-3.5 stroke-[3] ${task.is_completed ? 'animate-check' : ''}`} />
      </button>

      {/* Conteúdo da Tarefa */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-semibold leading-snug line-clamp-2 ${
            task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {task.title}
        </h4>

        {/* Metadados / Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
          {/* Badge de Data */}
          {dueInfo && (
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                dueInfo.isOverdue
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/60'
                  : dueInfo.isToday
                  ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200/60'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{dueInfo.label}</span>
            </span>
          )}

          {/* Badge de Subtarefas */}
          {task.subtasks && task.subtasks.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                task.subtasks.every((s) => s.is_completed)
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60'
                  : 'bg-gray-100 text-gray-600'
              }`}
              title="Tarefas do cartão (subtarefas)"
            >
              <CheckSquare className="w-3 h-3 text-blue-600" />
              <span>
                {task.subtasks.filter((s) => s.is_completed).length}/{task.subtasks.length}
              </span>
            </span>
          )}

          {/* Badge de Recorrência */}
          {recurrenceLabel && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-100"
              title={`Recorrência ativa: ${recurrenceLabel}`}
            >
              <Repeat className="w-3 h-3 text-blue-600" />
              <span>{recurrenceLabel}</span>
            </span>
          )}

          {/* Indicador de Descrição */}
          {task.description && (
            <span className="text-[11px] text-gray-400 truncate max-w-[180px]" title={task.description}>
              • {task.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity self-center">
        {onDeleteTask && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task.id, task.title);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 active:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Excluir tarefa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );
};
