import React, { useState, useEffect } from 'react';
import {
  Mail,
  Key,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { api, EmailConfigData } from '../services/api';
import { triggerHaptic } from '../services/notification';

interface EmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksImported?: (count: number) => void;
  showToast?: (message: string) => void;
}

type ProviderPreset = 'gmail' | 'outlook' | 'yahoo' | 'custom';

export const EmailIntegrationModal: React.FC<EmailIntegrationModalProps> = ({
  isOpen,
  onClose,
  onTasksImported,
  showToast,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [existingConfig, setExistingConfig] = useState<EmailConfigData | null>(null);

  // Formulário
  const [selectedProvider, setSelectedProvider] = useState<ProviderPreset>('gmail');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [host, setHost] = useState<string>('imap.gmail.com');
  const [port, setPort] = useState<number>(993);
  const [folder, setFolder] = useState<string>('INBOX');
  const [secure, setSecure] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Feedbacks
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await api.getEmailConfig();
      if (res.hasConfig && res.config) {
        setExistingConfig(res.config);
        setEmail(res.config.email);
        setHost(res.config.host);
        setPort(res.config.port || 993);
        setFolder(res.config.folder || 'INBOX');
        setSecure(res.config.secure !== false);

        // Deduce provider
        if (res.config.host.includes('gmail')) setSelectedProvider('gmail');
        else if (res.config.host.includes('office365') || res.config.host.includes('outlook')) setSelectedProvider('outlook');
        else if (res.config.host.includes('yahoo')) setSelectedProvider('yahoo');
        else setSelectedProvider('custom');
      } else {
        setExistingConfig(null);
        // Preenche com padrão Gmail
        selectProviderPreset('gmail');
      }
    } catch (err: any) {
      console.warn('Erro ao carregar configuração de e-mail:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectProviderPreset = (provider: ProviderPreset) => {
    setSelectedProvider(provider);
    setStatusMessage(null);

    switch (provider) {
      case 'gmail':
        setHost('imap.gmail.com');
        setPort(993);
        setSecure(true);
        setFolder('INBOX');
        break;
      case 'outlook':
        setHost('outlook.office365.com');
        setPort(993);
        setSecure(true);
        setFolder('INBOX');
        break;
      case 'yahoo':
        setHost('imap.mail.yahoo.com');
        setPort(993);
        setSecure(true);
        setFolder('INBOX');
        break;
      case 'custom':
        // Mantém os valores atuais para edição livre
        break;
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!email.trim() || !password.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, preencha o seu e-mail e a senha de app para testar a conexão.',
      });
      return;
    }

    try {
      setTesting(true);
      setStatusMessage(null);
      triggerHaptic();

      const result = await api.testEmailConnection({
        email: email.trim(),
        password: password.trim(),
        host: host.trim(),
        port: Number(port) || 993,
        secure,
        folder: folder.trim() || 'INBOX',
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message || 'Conexão validada com sucesso! O servidor aceitou suas credenciais.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message || 'Falha ao autenticar. Verifique se o e-mail ou a senha de app estão corretos.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erro inesperado ao conectar ao servidor de e-mail.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      return;
    }

    if (!existingConfig && !password.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Digite a senha de app da sua conta de e-mail para conectar.',
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);
      triggerHaptic();

      const res = await api.saveEmailConfig({
        email: email.trim(),
        host: host.trim(),
        port: Number(port) || 993,
        secure,
        folder: folder.trim() || 'INBOX',
        password: password.trim() || undefined,
        is_active: true,
      });

      setExistingConfig(res.config);
      setPassword('');
      setStatusMessage({
        type: 'success',
        text: 'Configuração salva com sucesso! O aplicativo sincronizará seus e-mails automaticamente.',
      });

      if (showToast) {
        showToast('E-mail conectado com sucesso!');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Falha ao salvar a configuração de e-mail.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setStatusMessage(null);
      triggerHaptic();

      const res = await api.syncEmailsNow();

      if (res.importedCount > 0) {
        setStatusMessage({
          type: 'success',
          text: `🎉 ${res.importedCount} nova(s) tarefa(s) importada(s) com sucesso para o seu Backlog!`,
        });
        if (onTasksImported) onTasksImported(res.importedCount);
        if (showToast) showToast(`${res.importedCount} tarefa(s) criada(s) a partir dos seus e-mails!`);
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Nenhum novo e-mail não lido encontrado para importar no momento.',
        });
      }

      // Atualiza data de última sincronização
      loadConfig();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erro ao sincronizar e-mails.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar esta conta de e-mail? Novas mensagens não serão mais importadas automaticamente.')) {
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);
      triggerHaptic();

      await api.removeEmailConfig();
      setExistingConfig(null);
      setEmail('');
      setPassword('');
      selectProviderPreset('gmail');

      setStatusMessage({
        type: 'info',
        text: 'Conta de e-mail desconectada com sucesso.',
      });

      if (showToast) showToast('Conta de e-mail desconectada');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erro ao desconectar conta.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-tight">Conectar E-mail Nativo</h2>
                <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full font-semibold">
                  Multi-usuário
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Crie tarefas automaticamente recebendo e-mails na sua caixa postal
              </p>
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

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Alertas de Status / Feedback */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* Cartão de Conta Conectada Ativa */}
          {existingConfig && existingConfig.is_active && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-900">Conta Ativa e Sincronizando</span>
                </div>
                <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-medium">
                  {existingConfig.host}
                </span>
              </div>

              <div className="text-xs text-gray-700 space-y-0.5">
                <p className="font-semibold text-gray-900">{existingConfig.email}</p>
                <p className="text-[11px] text-gray-500">
                  {existingConfig.last_sync_at
                    ? `Última sincronização: ${new Date(existingConfig.last_sync_at).toLocaleString('pt-BR')}`
                    : 'Aguardando primeira sincronização automática...'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Buscando E-mails...' : 'Sincronizar Agora'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  title="Desconectar e-mail"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </div>
            </div>
          )}

          {/* Seleção do Provedor de E-mail */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Selecione o Provedor de E-mail:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gmail', label: 'Gmail', icon: '🔴', desc: 'Google' },
                { id: 'outlook', label: 'Outlook', icon: '🔵', desc: 'Microsoft' },
                { id: 'yahoo', label: 'Yahoo', icon: '🟣', desc: 'Yahoo Mail' },
                { id: 'custom', label: 'Outro', icon: '⚙️', desc: 'IMAP livre' },
              ].map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => selectProviderPreset(prov.id as ProviderPreset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-base">{prov.icon}</span>
                    <span className="text-xs font-bold">{prov.label}</span>
                    <span className="text-[10px] text-gray-400">{prov.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tutorial rápido para Gmail / Senha de App */}
          {selectedProvider === 'gmail' && (
            <div className="border border-amber-200/80 rounded-xl bg-amber-50/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Como gerar uma Senha de App no Google (1 minuto)</span>
                </div>
                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showGuide && (
                <div className="p-3 pt-0 text-[11px] text-amber-900/90 space-y-2 border-t border-amber-200/50">
                  <p>
                    O Google não permite usar a senha normal por segurança. Você cria uma senha exclusiva para o app em 3 passos:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 font-medium">
                    <li>
                      Acesse{' '}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 underline font-bold"
                      >
                        myaccount.google.com/apppasswords
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Em "Nome do app", digite <strong>Todo App</strong> e clique em <strong>Criar</strong>.</li>
                    <li>Copie o código amarelo de 16 letras gerado e cole no campo de senha abaixo.</li>
                  </ol>
                  <p className="text-[10px] text-amber-800 italic">
                    Nota: Certifique-se de que a verificação em duas etapas esteja ativada na sua conta Google.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Formulário de Configuração */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Endereço de E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span>Senha de Aplicativo (App Password)</span>
                {existingConfig?.hasPassword && !password && (
                  <span className="text-[10px] text-emerald-600 font-normal">
                    ✓ Senha já configurada no servidor (deixe em branco para manter)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={existingConfig?.hasPassword ? '•••••••••••••••• (senha salva)' : 'Senha de 16 caracteres'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pl-9 pr-10 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <Key className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 p-0.5"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opções Avançadas do Servidor IMAP */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{showAdvanced ? 'Ocultar detalhes do servidor' : 'Opções avançadas de servidor (Host, Porta)'}</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 animate-in fade-in duration-100">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Servidor IMAP (Host)
                      </label>
                      <input
                        type="text"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Porta
                      </label>
                      <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Pasta de Leitura
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={folder}
                          onChange={(e) => setFolder(e.target.value)}
                          placeholder="INBOX"
                          className="w-full px-2.5 py-1.5 pl-7 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                        />
                        <Inbox className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="ssl-checkbox"
                        checked={secure}
                        onChange={(e) => setSecure(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="ssl-checkbox" className="text-xs text-gray-700 font-medium cursor-pointer">
                        Usar SSL / TLS seguro
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso de Isolamento & Segurança */}
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start gap-2 text-[11px] text-gray-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Isolamento Total:</strong> As credenciais ficam associadas unicamente ao seu ID de usuário. Outros usuários do app não têm acesso aos seus e-mails.
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="w-full sm:w-auto flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testando Conexão...' : 'Testar Conexão'}</span>
              </button>

              <button
                type="submit"
                disabled={loading || testing}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : existingConfig ? 'Atualizar Conexão' : 'Salvar e Conectar'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
