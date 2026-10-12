import React, { useState, useEffect } from 'react';
import {
  Bell,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Vibrate,
  X,
  Share,
  PlusSquare,
  Sparkles,
} from 'lucide-react';
import {
  subscribeToPushNotifications,
  sendTestNotification,
  getNotificationPermission,
  triggerHaptic,
  isPushSupported,
} from '../services/notification';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallApp: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallApp,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setFeedback(null);

      // Detecta iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleMobile);

      // Detecta se já está rodando instalado como PWA standalone
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    triggerHaptic(40);

    const result = await subscribeToPushNotifications();
    setPermission(getNotificationPermission());
    setLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setFeedback(null);
    triggerHaptic([60, 40, 60]);

    const result = await sendTestNotification();
    setLoading(false);

    if (result.success) {
      setFeedback({
        type: 'success',
        message: '🔔 Notificação enviada! Verifique a tela de bloqueio e sinta a vibração.',
      });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">App no Celular & Notificações</h2>
              <p className="text-xs text-blue-100">Instalação e alertas com vibração</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium leading-relaxed ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Seção 1: Notificações & Vibração */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800">Alertas e Vibração</h3>
                  <p className="text-[11px] text-gray-500">
                    Status:{' '}
                    {permission === 'granted' ? (
                      <span className="text-emerald-600 font-semibold">Ativado 🔔</span>
                    ) : permission === 'denied' ? (
                      <span className="text-rose-600 font-semibold">Bloqueado no navegador</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Não ativado</span>
                    )}
                  </p>
                </div>
              </div>

              {permission === 'granted' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Ativo
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Receba avisos com vibração na tela de bloqueio quando tarefas vencerem ou chegarem via e-mail.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading || permission === 'denied'}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>{loading ? 'Solicitando...' : 'Ativar Notificações'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Vibrate className="w-4 h-4" />
                  <span>{loading ? 'Enviando...' : 'Testar Som & Vibração Agora'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Seção 2: Instalação no Celular */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/70 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-800">Instalar na Tela de Início</h3>
                <p className="text-[11px] text-gray-500">
                  {isStandalone ? 'Aplicativo já instalado no dispositivo! ✨' : 'Funciona como app nativo em tela cheia'}
                </p>
              </div>
            </div>

            {isStandalone ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Você já está usando o aplicativo instalado em tela cheia.</span>
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Clique no botão abaixo para adicionar o app à tela do seu celular com um toque.
                </p>
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Instalar Aplicativo Agora</span>
                </button>
              </div>
            ) : isIOS ? (
              <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-700 space-y-2">
                <p className="font-semibold text-gray-800">Como instalar no iPhone (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li className="flex items-center gap-1.5">
                    1. Toque em <strong>Compartilhar</strong>{' '}
                    <Share className="w-3.5 h-3.5 inline text-blue-600" />
                  </li>
                  <li className="flex items-center gap-1.5">
                    2. Escolha <strong>Adicionar à Tela de Início</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-gray-700" />
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800">No Android (Chrome):</p>
                <p>
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior do navegador e selecione{' '}
                  <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
