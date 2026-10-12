import React from 'react';
import {
  Sun,
  Calendar,
  Inbox,
  CheckCircle2,
  Plus,
  Kanban,
  ListFilter,
  Folder,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { ListType, ColumnList, User } from '../types/task';

interface SidebarProps {
  currentList: ListType;
  columns: ColumnList[];
  onSelectList: (list: ListType) => void;
  taskCounts: Record<string, number>;
  isOpen: boolean;
  onCloseMobile?: () => void;
  viewMode: 'list' | 'kanban';
  onToggleViewMode: (mode: 'list' | 'kanban') => void;
  onOpenCreateColumn: () => void;
  onOpenCreateTask?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentList,
  columns,
  onSelectList,
  taskCounts,
  isOpen,
  onCloseMobile,
  viewMode,
  onToggleViewMode,
  onOpenCreateColumn,
  onOpenCreateTask,
  currentUser,
  onLogout,
}) => {
  const getIconForSlug = (slug: string, color?: string | null) => {
    switch (slug) {
      case 'my_day':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'planned':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'backlog':
        return <Inbox className="w-5 h-5 text-indigo-500" />;
      default:
        return (
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color || '#3b82f6' }}
          />
        );
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight text-base tracking-tight">
                To Do & Kanban
              </h1>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wider">
                MICROSOFT TO DO + TRELLO
              </span>
            </div>
          </div>
        </div>

        {/* Alternador de Visão: Lista vs Kanban */}
        <div className="p-3 border-b border-gray-100">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleViewMode('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-blue-600" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('kanban')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quadro Trello</span>
            </button>
          </div>
        </div>

        {/* Botão de Criação Completa Rápida */}
        {onOpenCreateTask && (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Tarefa / Cartão</span>
            </button>
          </div>
        )}

        {/* Navigation Lists */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Suas Listas / Colunas
            </span>
            <button
              type="button"
              onClick={onOpenCreateColumn}
              className="text-gray-400 hover:text-blue-600 p-0.5 rounded hover:bg-gray-100"
              title="Criar nova lista ou coluna"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {columns.map((col) => {
            const isActive = currentList === col.slug && viewMode === 'list';
            const count = taskCounts[col.slug] || 0;

            return (
              <button
                key={col.id}
                onClick={() => {
                  onSelectList(col.slug);
                  if (viewMode === 'kanban') onToggleViewMode('list');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getIconForSlug(col.slug, col.color)}
                  <span className="truncate">{col.name}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-white text-blue-700 shadow-xs' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenCreateColumn}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Lista / Coluna</span>
          </button>
        </nav>

        {/* Perfil do Usuário Autenticado & Logout */}
        {currentUser && (
          <div className="p-3 border-t border-gray-100 bg-gray-50/70">
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white border border-gray-200/70 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                  {getUserInitials(currentUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-800 truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate" title={currentUser.email}>
                    {currentUser.email}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
