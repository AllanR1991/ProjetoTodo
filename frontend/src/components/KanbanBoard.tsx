import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Menu,
  Kanban,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  ListFilter,
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
  onOpenMobileMenu?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  viewMode?: 'list' | 'kanban';
  onToggleViewMode?: (mode: 'list' | 'kanban') => void;
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
  onOpenMobileMenu,
  onToggleSidebar,
  isSidebarCollapsed = false,
  viewMode = 'kanban',
  onToggleViewMode,
}) => {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [addingTaskCol, setAddingTaskCol] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);

  // Controle de rolagem horizontal avançada
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeColSlug, setActiveColSlug] = useState<string>(columns[0]?.slug || 'my_day');

  // Controle de arrastar para rolar (pan) com o mouse
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [panScrollLeft, setPanScrollLeft] = useState(0);

  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 25);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 25);

    // Identifica qual coluna está centralizada na visualização
    const containerCenter = scrollLeft + clientWidth / 2;
    for (const col of columns) {
      const colEl = document.getElementById(`kanban-col-${col.slug}`);
      if (colEl) {
        const left = colEl.offsetLeft;
        const right = left + colEl.offsetWidth;
        if (containerCenter >= left && containerCenter <= right) {
          setActiveColSlug(col.slug);
          break;
        }
      }
    }
  }, [columns]);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll]);

  // Rola suavemente até a coluna selecionada
  const scrollToColumn = (colSlug: string) => {
    setActiveColSlug(colSlug);
    const colEl = document.getElementById(`kanban-col-${colSlug}`);
    if (colEl) {
      colEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Rolar horizontalmente por quantidade fixa (botões flutuantes < e >)
  const scrollByAmount = (amount: number) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Suporte a rolar a rodinha padrão do mouse para os lados
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    if (Math.abs(e.deltaY) > 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY * 1.1;
    }
  };

  // Panning com o mouse arrastando no fundo do quadro
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[draggable="true"]') ||
      target.closest('.kanban-card')
    ) {
      return;
    }
    if (!scrollContainerRef.current) return;
    setIsPanning(true);
    setPanStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setPanScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - panStartX) * 1.5;
    scrollContainerRef.current.scrollLeft = panScrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  // Auto-scroll durante drag-and-drop de cartões para colunas distantes
  const handleDragOverContainer = (e: React.DragEvent) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const edgeThreshold = 90;
    const speed = 14;

    if (e.clientX < rect.left + edgeThreshold) {
      scrollContainerRef.current.scrollLeft -= speed;
    } else if (e.clientX > rect.right - edgeThreshold) {
      scrollContainerRef.current.scrollLeft += speed;
    }
  };

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f5f8]">
      {/* Top Header do Quadro Kanban */}
      <div className="p-3 sm:p-4 pb-2.5 sm:pb-3 flex items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-xs flex-shrink-0">
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

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Kanban className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                Quadro Kanban
              </h2>
              <p className="text-[11px] text-gray-500 font-medium truncate">
                {columns.length} colunas · {tasks.filter((t) => !t.is_completed).length} cards pendentes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Alternador Rápido de Visão: Lista vs Kanban */}
          {onToggleViewMode && (
            <div className="flex bg-gray-100/90 p-0.5 rounded-xl items-center border border-gray-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleViewMode('list')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Visualização em Quadro Kanban"
              >
                <Kanban className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Quadro</span>
              </button>
            </div>
          )}

          {onOpenFullCreate && (
            <button
              type="button"
              onClick={() => onOpenFullCreate('backlog')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Cartão</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCreateColumn}
            className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Coluna</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegação Rápida entre Colunas (Pill Bar com 1-Click Jump) */}
      <div className="px-3 sm:px-5 py-2 bg-white/70 backdrop-blur-xs border-b border-gray-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 select-none">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-1 hidden sm:inline">
          Ir para:
        </span>
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.list_type === col.slug);
          const isActive = activeColSlug === col.slug;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => scrollToColumn(col.slug)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: col.color || '#3b82f6' }}
              />
              <span className="truncate max-w-[120px]">{col.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Área Central do Quadro com Suporte a Rolagem Suave, Mouse Wheel e Panning */}
      <div className="relative flex-1 overflow-hidden">
        {/* Botão Flutuante Esquerdo (<) para Desktop */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-350)}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 text-gray-700 shadow-xl border border-gray-200 items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all"
            title="Navegar para esquerda"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Botão Flutuante Direito (>) para Desktop */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(350)}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 text-gray-700 shadow-xl border border-gray-200 items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all"
            title="Navegar para direita"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Container das Colunas com Scroll Horizontal Suave */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onDragOver={handleDragOverContainer}
          className={`h-full overflow-x-auto overflow-y-hidden p-3 sm:p-5 flex gap-4 sm:gap-5 items-start snap-x snap-mandatory ${
            isPanning ? 'cursor-grabbing select-none' : 'cursor-default'
          }`}
        >
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.list_type === col.slug);
            const isOver = dragOverCol === col.slug;

            return (
              <div
                key={col.id}
                id={`kanban-col-${col.slug}`}
                onDragOver={(e) => handleDragOver(e, col.slug)}
                onDragLeave={(e) => handleDragLeave(e, col.slug)}
                onDrop={(e) => handleDrop(e, col.slug)}
                className={`w-[84vw] sm:w-80 flex-shrink-0 snap-center sm:snap-align-none flex flex-col max-h-full rounded-2xl bg-[#ebecf0]/80 border transition-all duration-200 ${
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

                      <div className="flex items-center gap-1 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 hidden sm:block" />
                      </div>
                    </div>

                    {/* Barra de Ação Rápida: Mover de Lista no Celular ou Desktop com 1 Toque */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingCardId(movingCardId === task.id ? null : task.id);
                          }}
                          className="px-2 py-1 bg-gray-100/90 hover:bg-blue-50 text-gray-700 hover:text-blue-700 active:bg-blue-100 font-semibold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                          title="Mover cartão para outra lista"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                          <span>Mover para...</span>
                        </button>

                        {/* Popover / Menu de Destino */}
                        {movingCardId === task.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 bottom-full mb-1.5 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 w-52 animate-in fade-in zoom-in-95"
                          >
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
                              <span>Mover para:</span>
                              <span className="text-[9px] text-blue-600">1 toque</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1">
                              {columns
                                .filter((c) => c.slug !== col.slug)
                                .map((targetCol) => (
                                  <button
                                    key={targetCol.id}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setMovingCardId(null);
                                      await onMoveTask(task.id, targetCol.slug);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 flex items-center gap-2 text-left transition-colors"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs"
                                      style={{ backgroundColor: targetCol.color || '#3b82f6' }}
                                    />
                                    <span className="truncate">{targetCol.name}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                        ou arraste
                      </span>
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
      </div>
    </div>
  );
};
