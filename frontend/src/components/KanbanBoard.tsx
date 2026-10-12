import React, { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Check,
  Calendar,
  Repeat,
  Trash2,
  Edit2,
  GripVertical,
  CheckSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { Task, ColumnList } from '../types/task';

interface KanbanBoardProps {
  columns: ColumnList[];
  tasks: Task[];
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task, e: React.MouseEvent) => void;
  onMoveTask: (taskId: string, targetSlug: string) => Promise<void>;
  onAddTaskToColumn: (title: string, columnSlug: string) => Promise<void>;
  onOpenCreateColumn: () => void;
  onEditColumn: (column: ColumnList) => void;
  onDeleteColumn: (columnId: string) => void;
  onDeleteTask: (taskId: string, taskTitle?: string) => void;
  onOpenFullCreate?: (columnSlug: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  selectedTask,
  onSelectTask,
  onToggleComplete,
  onMoveTask,
  onAddTaskToColumn,
  onOpenCreateColumn,
  onEditColumn,
  onDeleteColumn,
  onDeleteTask,
  onOpenFullCreate,
}) => {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [addingTaskCol, setAddingTaskCol] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colSlug: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colSlug) {
      setDragOverCol(colSlug);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, colSlug: string) => {
    if (dragOverCol === colSlug) {
      setDragOverCol(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, colSlug: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await onMoveTask(taskId, colSlug);
    }
  };

  const handleQuickAdd = async (colSlug: string) => {
    if (!quickTitle.trim()) return;
    await onAddTaskToColumn(quickTitle.trim(), colSlug);
    setQuickTitle('');
    setAddingTaskCol(null);
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#f4f5f8] flex gap-5 items-start h-full">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.list_type === col.slug);
        const isOver = dragOverCol === col.slug;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.slug)}
            onDragLeave={(e) => handleDragLeave(e, col.slug)}
            onDrop={(e) => handleDrop(e, col.slug)}
            className={`w-80 flex-shrink-0 flex flex-col max-h-full rounded-2xl bg-[#ebecf0]/80 border transition-all duration-200 ${
              isOver
                ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/40 shadow-md'
                : 'border-gray-200/80 shadow-xs'
            }`}
          >
            {/* Header da Coluna */}
            <div className="p-3.5 pb-2 flex items-center justify-between border-b border-gray-200/60 relative">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: col.color || '#3b82f6' }}
                />
                <h3 className="font-bold text-gray-800 text-sm truncate tracking-tight">
                  {col.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200/80 text-gray-600 font-semibold">
                  {colTasks.length}
                </span>
              </div>

              {/* Botão de Opções da Coluna */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuColId(activeMenuColId === col.id ? null : col.id)
                  }
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeMenuColId === col.id && (
                  <div className="absolute right-0 top-7 z-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-44 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuColId(null);
                        onEditColumn(col);
                      }}
                      className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-2 text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Editar coluna</span>
                    </button>
                    {!col.is_system && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuColId(null);
                          onDeleteColumn(col.id);
                        }}
                        className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir coluna</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista com Scroll de Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
              {colTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                const dueDateFormatted = formatDueDate(task.due_date);

                return (
                  <div
                    key={task.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onSelectTask(task)}
                    className={`group bg-white rounded-xl p-3.5 border transition-all cursor-grab active:cursor-grabbing shadow-xs select-none ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                        : 'border-gray-200/90 hover:border-gray-300 hover:shadow-md'
                    } ${task.is_completed ? 'opacity-60 bg-gray-50/70' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task, e);
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                          task.is_completed
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-500 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs font-semibold leading-snug break-words ${
                            task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {task.title}
                        </h4>

                        {/* Metadados / Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-gray-500">
                          {dueDateFormatted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              <Calendar className="w-3 h-3" />
                              <span>{dueDateFormatted}</span>
                            </span>
                          )}

                          {task.subtasks && task.subtasks.length > 0 && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-[10px] ${
                                task.subtasks.every((s) => s.is_completed)
                                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                              title="Subtarefas / Checklist do cartão"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>
                                {task.subtasks.filter((s) => s.is_completed).length}/
                                {task.subtasks.length}
                              </span>
                            </span>
                          )}

                          {task.recurrence_rule && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium"
                              title="Tarefa recorrente"
                            >
                              <Repeat className="w-3 h-3 text-blue-600" />
                              <span>Recorrente</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id, task.title);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Excluir cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && !isOver && (
                <div className="py-6 text-center text-xs text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                  Arraste cards para cá
                </div>
              )}
            </div>

            {/* Rodapé: Adicionar Card Rápido */}
            <div className="p-2.5 pt-1 border-t border-gray-200/60">
              {addingTaskCol === col.slug ? (
                <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd(col.slug);
                      if (e.key === 'Escape') setAddingTaskCol(null);
                    }}
                    placeholder="Título do novo cartão..."
                    className="w-full text-xs outline-none font-medium text-gray-800"
                  />
                  <div className="flex items-center justify-between gap-1.5">
                    {onOpenFullCreate && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingTaskCol(null);
                          onOpenFullCreate(col.slug);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Mais opções</span>
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => setAddingTaskCol(null)}
                        className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(col.slug)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingTaskCol(col.slug);
                    setQuickTitle('');
                  }}
                  className="w-full py-2 px-3 flex items-center gap-1.5 text-xs text-gray-600 font-semibold hover:bg-gray-200/70 rounded-xl transition-colors text-left"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar um cartão</span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Botão de Adicionar Nova Coluna / Lista (Estilo Trello) */}
      <button
        type="button"
        onClick={onOpenCreateColumn}
        className="w-72 flex-shrink-0 h-14 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-700 transition-all shadow-xs"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar outra lista / coluna</span>
      </button>
    </div>
  );
};
