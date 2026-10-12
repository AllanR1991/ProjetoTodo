import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Check, Clock, Layers, Save, CheckSquare, Plus, FileText } from 'lucide-react';
import { Task, UpdateTaskDTO, ListType, RecurrenceRule, ColumnList, Subtask } from '../types/task';
import { RecurrenceSelector } from './RecurrenceSelector';
import { generateUUID } from '../utils/uuid';

interface TaskDetailPaneProps {
  task: Task | null;
  columns?: ColumnList[];
  onClose: () => void;
  onUpdateTask: (id: string, updates: UpdateTaskDTO) => Promise<void>;
  onDeleteTask: (id: string, title?: string) => Promise<void> | void;
  onToggleComplete: (task: Task) => Promise<void>;
}

export const TaskDetailPane: React.FC<TaskDetailPaneProps> = ({
  task,
  columns = [],
  onClose,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
}) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [listType, setListType] = useState<ListType>(task.list_type);
  const [dueDate, setDueDate] = useState<string>(
    task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
  );
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(task.recurrence_rule);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincroniza estado interno quando a tarefa selecionada mudar
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setListType(task.list_type);
    setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
    setRecurrence(task.recurrence_rule);
    setSubtasks(task.subtasks || []);
    setNewSubtaskTitle('');
    setHasChanges(false);
  }, [task.id]);

  const markDirty = () => setHasChanges(true);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: Subtask = {
      id: generateUUID(),
      title: newSubtaskTitle.trim(),
      is_completed: false,
    };
    setSubtasks((prev) => [...prev, item]);
    setNewSubtaskTitle('');
    markDirty();
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_completed: !s.is_completed } : s))
    );
    markDirty();
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    markDirty();
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdateTask(task.id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        list_type: listType,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        recurrence_rule: recurrence,
        subtasks: subtasks,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Falha ao salvar detalhes da tarefa:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.is_completed).length;

  return (
    <aside className="fixed inset-0 z-50 md:static md:w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl md:shadow-none transition-all animate-in fade-in slide-in-from-right duration-200">
      {/* Header com Ações Rápidas */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleComplete(task)}
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              task.is_completed
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 hover:border-blue-500 text-transparent'
            }`}
            title="Concluir tarefa"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {task.is_completed ? 'Concluída' : 'Em Aberto'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDeleteTask(task.id, task.title)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Excluir tarefa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 1. Título Editável */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Título da Tarefa
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Título da tarefa..."
            className={`w-full font-semibold text-base text-gray-900 border-b border-gray-200 pb-1 focus:border-blue-500 focus:outline-none transition-colors ${
              task.is_completed ? 'line-through text-gray-400' : ''
            }`}
          />
        </div>

        {/* 2. Categoria / Lista (Mover para Lista) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Mover para Lista</span>
          </label>
          <select
            value={listType}
            onChange={(e) => {
              setListType(e.target.value as ListType);
              markDirty();
            }}
            className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            {columns.length > 0 ? (
              columns.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))
            ) : (
              <>
                <option value="my_day">☀️ Meu Dia</option>
                <option value="planned">📅 Planejadas</option>
                <option value="backlog">📥 Backlog / Tarefas</option>
              </>
            )}
          </select>
        </div>

        {/* 3. Descrição / Anotações (LOGO APÓS "Mover para", conforme solicitado) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Descrição / Anotações</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            rows={4}
            placeholder="Adicione notas, links ou detalhes adicionais..."
            className="w-full text-xs p-3 bg-white border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-normal leading-relaxed placeholder-gray-400"
          />
        </div>

        {/* 4. Tarefas do Card (Subtarefas / Checklist - LOGO APÓS "Descrição") */}
        <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Tarefas do Card (Subtarefas)</span>
            </div>
            {subtasks.length > 0 && (
              <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {completedSubtasksCount} de {subtasks.length} concluídas
              </span>
            )}
          </div>

          {/* Barra de Progresso */}
          {subtasks.length > 0 && (
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round((completedSubtasksCount / subtasks.length) * 100)}%`,
                }}
              />
            </div>
          )}

          {/* Lista de Subtarefas */}
          {subtasks.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-gray-200 text-xs shadow-2xs group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                        st.is_completed
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {st.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`truncate ${
                        st.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover subtarefa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input para Adicionar Nova Subtarefa */}
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              placeholder="Adicionar etapa ou subtarefa..."
              className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 font-semibold rounded-lg text-xs transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* 5. Data de Vencimento */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Data de Vencimento (Due Date)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                markDirty();
              }}
              className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => {
                  setDueDate('');
                  markDirty();
                }}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* 6. Regra de Recorrência (Core) */}
        <RecurrenceSelector
          value={recurrence}
          onChange={(newRule) => {
            setRecurrence(newRule);
            markDirty();
          }}
        />

        {/* 7. Metadados Técnicos do Banco (Prisma) */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-500 space-y-1.5 font-mono">
          <div className="flex items-center gap-1 text-gray-400 mb-1 font-sans font-semibold">
            <Clock className="w-3 h-3" />
            <span>Metadados da Tarefa</span>
          </div>
          <div>ID: <span className="text-gray-700">{task.id}</span></div>
          {task.parent_task_id && (
            <div className="text-blue-700">
              Parent ID: <span>{task.parent_task_id}</span> (Série recorrente)
            </div>
          )}
          <div>Criada em: {new Date(task.created_at).toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Footer com Botão de Excluir e Salvar */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDeleteTask(task.id, task.title)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200/80 transition-colors"
          title="Excluir este cartão"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Excluir</span>
        </button>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-[11px] text-amber-600 font-medium hidden sm:inline">
              Não salvo
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
