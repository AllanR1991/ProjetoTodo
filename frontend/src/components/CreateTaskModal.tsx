import React, { useState } from 'react';
import {
  X,
  Layers,
  Calendar,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Check,
  FileText,
} from 'lucide-react';
import { ColumnList, ListType, RecurrenceRule, Subtask, CreateTaskDTO } from '../types/task';
import { RecurrenceSelector } from './RecurrenceSelector';
import { generateUUID } from '../utils/uuid';

interface CreateTaskModalProps {
  isOpen: boolean;
  columns: ColumnList[];
  defaultList: ListType;
  onClose: () => void;
  onCreateTask: (taskData: CreateTaskDTO) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  columns,
  defaultList,
  onClose,
  onCreateTask,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [listType, setListType] = useState<ListType>(defaultList || 'my_day');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);

  // Subtarefas (Checklist)
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Adicionar subtarefa
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: Subtask = {
      id: generateUUID(),
      title: newSubtaskTitle.trim(),
      is_completed: false,
    };
    setSubtasks((prev) => [...prev, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_completed: !s.is_completed } : s))
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // Atalhos de Data
  const handleSetQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await onCreateTask({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        list_type: listType,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        recurrence_rule: recurrence,
        subtasks: subtasks.length > 0 ? subtasks : [],
      });
      onClose();
    } catch (error) {
      console.error('Falha ao criar tarefa com dados completos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.is_completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Criar Nova Tarefa / Cartão
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Insira todas as informações, descrição, subtarefas e repetições
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* 1. Título do Cartão */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Título da Tarefa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desenvolver fluxo de autenticação, Comprar suprimentos..."
              className="w-full text-sm font-semibold p-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>

          {/* 2. Mover para Lista / Coluna */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Mover para Lista / Coluna</span>
            </label>
            <select
              value={listType}
              onChange={(e) => setListType(e.target.value as ListType)}
              className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
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

          {/* 3. Descrição / Anotações (Logo após "Mover para", conforme solicitado) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Descrição / Anotações do Cartão</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Adicione orientações, anotações detalhadas, links ou contexto..."
              className="w-full text-xs p-3 bg-white border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-normal leading-relaxed placeholder-gray-400"
            />
          </div>

          {/* 4. Tarefas do Card (Subtarefas / Checklist - Logo após a Descrição) */}
          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
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

            {/* Lista de Subtarefas adicionadas */}
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
                placeholder="Adicionar uma etapa ou subtarefa... (Pressione Enter)"
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

          {/* 5. Data de Conclusão (Due Date) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Data de Conclusão (Due Date)</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(0)}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(1)}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium"
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(7)}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium"
                >
                  +7 dias
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="px-1.5 py-0.5 text-red-500 hover:underline text-[10px]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            />
          </div>

          {/* 6. Regra de Recorrência (Repetição com previsão das 5 próximas ocorrências) */}
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
        </form>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Criando...' : 'Criar Cartão / Tarefa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
