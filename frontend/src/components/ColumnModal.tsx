import React, { useState } from 'react';
import { X, Palette } from 'lucide-react';
import { ColumnList } from '../types/task';

interface ColumnModalProps {
  isOpen: boolean;
  columnToEdit?: ColumnList | null;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
}

const AVAILABLE_COLORS = [
  '#2564cf', // Azul MS
  '#d97706', // Âmbar
  '#10b981', // Esmeralda
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#ef4444', // Vermelho
  '#06b6d4', // Ciano
  '#6b7280', // Grafite
];

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  columnToEdit,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(columnToEdit?.name || '');
  const [color, setColor] = useState(columnToEdit?.color || AVAILABLE_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave(name.trim(), color);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar coluna:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="font-bold text-gray-900 text-base">
            {columnToEdit ? 'Editar Coluna' : 'Nova Coluna / Lista'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Nome da Coluna
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Em Progresso, Revisão, Ideias..."
              className="w-full text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
              <Palette className="w-3.5 h-3.5 text-blue-600" />
              <span>Cor do Marcador</span>
            </label>
            <div className="flex items-center gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-115 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : columnToEdit ? 'Atualizar' : 'Criar Coluna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
