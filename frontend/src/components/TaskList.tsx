import React, { useState } from 'react';
import { Sun, Calendar, Inbox, ChevronDown, ChevronRight, CheckCircle, Menu } from 'lucide-react';
import { Task, ListType, RecurrenceRule } from '../types/task';
import { QuickAddTask } from './QuickAddTask';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  currentList: ListType;
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  onAddTask: (title: string, listType: ListType, dueDate?: string | null, recurrence?: RecurrenceRule | null) => Promise<void>;
  onOpenMobileMenu: () => void;
  onDeleteTask?: (taskId: string, taskTitle?: string) => void;
  onOpenFullCreate?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  currentList,
  tasks,
  selectedTask,
  isLoading,
  onSelectTask,
  onToggleComplete,
  onAddTask,
  onOpenMobileMenu,
  onDeleteTask,
  onOpenFullCreate,
}) => {
  const [showCompleted, setShowCompleted] = useState(false);

  // Divide tarefas entre ativas e concluídas
  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  const getListMeta = () => {
    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    switch (currentList) {
      case 'my_day':
        return {
          title: 'Meu Dia',
          icon: <Sun className="w-6 h-6 text-amber-500" />,
          subtitle: today,
          colorTheme: 'text-amber-900',
        };
      case 'planned':
        return {
          title: 'Planejadas',
          icon: <Calendar className="w-6 h-6 text-blue-500" />,
          subtitle: 'Tarefas agendadas com data de vencimento',
          colorTheme: 'text-blue-900',
        };
      case 'backlog':
      default:
        return {
          title: 'Backlog / Tarefas',
          icon: <Inbox className="w-6 h-6 text-indigo-500" />,
          subtitle: 'Todas as tarefas pendentes e itens de e-mail recebidos',
          colorTheme: 'text-indigo-900',
        };
    }
  };

  const meta = getListMeta();

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
      {/* Top Header da Lista */}
      <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-100 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {meta.icon}
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{meta.title}</h2>
              <p className="text-xs text-gray-500 capitalize">{meta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-400">
          {pendingTasks.length} {pendingTasks.length === 1 ? 'pendente' : 'pendentes'}
        </div>
      </div>

      {/* Área com Scroll da Lista */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-5">
        {/* Input Rápido no topo (Adicionar direto no Backlog / View atual) */}
        <QuickAddTask
          currentList={currentList}
          onAddTask={onAddTask}
          onOpenFullCreate={onOpenFullCreate}
        />

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-gray-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Lista de Tarefas Pendentes */}
        {!isLoading && pendingTasks.length > 0 && (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                onSelect={onSelectTask}
                onToggleComplete={onToggleComplete}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <CheckCircle className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">Tudo limpo por aqui!</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Nenhuma tarefa pendente nesta lista. Adicione uma nova tarefa acima para começar seu dia produtivo.
            </p>
          </div>
        )}

        {/* Seção de Tarefas Concluídas */}
        {!isLoading && completedTasks.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 py-1 transition-colors"
            >
              {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Concluídas ({completedTasks.length})</span>
            </button>

            {showCompleted && (
              <div className="space-y-2 mt-3">
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isSelected={selectedTask?.id === task.id}
                    onSelect={onSelectTask}
                    onToggleComplete={onToggleComplete}
                    onDeleteTask={onDeleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
