import React, { useState } from 'react';
import { Sun, Calendar, Inbox, ChevronDown, ChevronRight, CheckCircle, Menu, PanelLeft, Kanban, ListFilter } from 'lucide-react';
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
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  viewMode?: 'list' | 'kanban';
  onToggleViewMode?: (mode: 'list' | 'kanban') => void;
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
  onToggleSidebar,
  isSidebarCollapsed = false,
  viewMode = 'list',
  onToggleViewMode,
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
      <div className="p-3.5 sm:p-5 pb-3 sm:pb-3.5 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-xs flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Botão de Toggle do Menu (Mobile e Web Desktop) */}
          <button
            type="button"
            onClick={onToggleSidebar || onOpenMobileMenu}
            className="p-2 -ml-1 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center flex-shrink-0"
            title={isSidebarCollapsed ? 'Exibir menu lateral (Ctrl+B)' : 'Ocultar menu lateral (Ctrl+B)'}
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {meta.icon}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate leading-tight">{meta.title}</h2>
              <p className="text-[11px] text-gray-500 capitalize truncate">{meta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Alternador Rápido de Visão: Lista vs Kanban */}
          {onToggleViewMode && (
            <div className="flex bg-gray-100/90 p-0.5 rounded-xl items-center border border-gray-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleViewMode('list')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Visualização em Lista"
              >
                <ListFilter className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('kanban')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Visualização em Quadro Kanban (Trello)"
              >
                <Kanban className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Quadro</span>
              </button>
            </div>
          )}

          <span className="hidden xs:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {pendingTasks.length} {pendingTasks.length === 1 ? 'pendente' : 'pendentes'}
          </span>

          {onOpenFullCreate && (
            <button
              type="button"
              onClick={onOpenFullCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Criar tarefa com todas as opções"
            >
              <span>+ Novo</span>
            </button>
          )}
        </div>
      </div>

      {/* Área com Scroll da Lista */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 max-w-4xl w-full mx-auto space-y-4 sm:space-y-5">
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
