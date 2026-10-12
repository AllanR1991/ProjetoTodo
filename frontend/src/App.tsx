import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetailPane } from './components/TaskDetailPane';
import { ColumnModal } from './components/ColumnModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { NotificationModal } from './components/NotificationModal';
import { EmailIntegrationModal } from './components/EmailIntegrationModal';
import { Task, ListType, UpdateTaskDTO, RecurrenceRule, ColumnList, User, CreateTaskDTO } from './types/task';
import { triggerHaptic } from './services/notification';
import { api } from './services/api';
import { generateUUID } from './utils/uuid';
import { getUserCache, setUserCache, clearUserCache } from './services/cache';
import { LoginScreen } from './components/LoginScreen';
import { AlertCircle, RefreshCw, Plus } from 'lucide-react';

const INITIAL_DEFAULT_COLUMNS: ColumnList[] = [
  { id: 'col-my-day', name: 'Meu Dia', slug: 'my_day', color: '#d97706', icon: 'Sun', position: 0, is_system: true },
  { id: 'col-planned', name: 'Planejadas', slug: 'planned', color: '#2564cf', icon: 'Calendar', position: 1, is_system: true },
  { id: 'col-backlog', name: 'Backlog / Tarefas', slug: 'backlog', color: '#4f46e5', icon: 'Inbox', position: 2, is_system: true },
];

const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    title: 'Revisar métricas semanais da equipe',
    description: 'Verificar relatórios de sprint e atualizar o dashboard no Supabase.',
    list_type: 'my_day',
    due_date: new Date().toISOString(),
    is_completed: false,
    recurrence_rule: { type: 'weekly', days: [1, 3] }, // Seg e Qua
    parent_task_id: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    title: 'Deploy da API Express no Render',
    description: 'Configurar variáveis de ambiente DATABASE_URL e DIRECT_URL no dashboard do Render.',
    list_type: 'planned',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    is_completed: false,
    recurrence_rule: null,
    parent_task_id: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    title: 'Configurar Webhook do Make.com para e-mails',
    description: '[Remetente: suporte@cliente.com]\n\nTestar o envio de payload para /webhooks/incoming-email.',
    list_type: 'backlog',
    due_date: null,
    is_completed: false,
    recurrence_rule: null,
    parent_task_id: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => api.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());

  const [currentList, setCurrentList] = useState<ListType>('my_day');

  // Inicializa com cache seguro do usuário para carregamento INSTANTÂNEO (0 delay)
  const [columns, setColumns] = useState<ColumnList[]>(() => {
    const user = api.getCurrentUser();
    const cached = getUserCache<ColumnList[]>(user?.id, 'columns');
    return cached && cached.length > 0 ? cached : INITIAL_DEFAULT_COLUMNS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const user = api.getCurrentUser();
    const cached = getUserCache<Task[]>(user?.id, 'tasks');
    return cached || [];
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Se já temos tarefas locais salvas em cache, nunca trava a tela com tela branca ou spinner
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const user = api.getCurrentUser();
    const cached = getUserCache<Task[]>(user?.id, 'tasks');
    return !cached || cached.length === 0;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modo de visualização: 'list' (Microsoft To Do) ou 'kanban' (Trello)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Controle do modal de criação de tarefa COMPLETA com todas as opções
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskInitialList, setCreateTaskInitialList] = useState<ListType>('my_day');

  // Controle do modal de alteração de senha
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Controle de PWA e Notificações Push
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Escuta evento de instalação nativo do navegador
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      showToast('✨ Aplicativo instalado com sucesso!');
    }
    setDeferredPrompt(null);
  };

  // Controle do modal de criação/edição de colunas
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnToEdit, setColumnToEdit] = useState<ColumnList | null>(null);

  // Controle de modal de confirmação de exclusão de tarefa e coluna
  const [deleteTaskModal, setDeleteTaskModal] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string | null;
  }>({
    isOpen: false,
    taskId: null,
    taskTitle: null,
  });

  const [columnToDelete, setColumnToDelete] = useState<ColumnList | null>(null);

  // Toast de notificação
  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  // Escuta desautenticação global (sessão expirada / 401)
  useEffect(() => {
    const unsubscribe = api.onUnauthorized(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      showToast('Sessão expirada. Por favor, faça login novamente.');
    });
    return unsubscribe;
  }, []);

  // Persistência automática no cache seguro local isolado por usuário
  useEffect(() => {
    if (currentUser && tasks.length > 0) {
      setUserCache(currentUser.id, 'tasks', tasks);
    }
  }, [currentUser, tasks]);

  useEffect(() => {
    if (currentUser && columns.length > 0) {
      setUserCache(currentUser.id, 'columns', columns);
    }
  }, [currentUser, columns]);

  // Carrega colunas e tarefas (suporta modo silencioso para sync em segundo plano sem piscar tela)
  const loadData = useCallback(async (isSilent = false) => {
    if (!api.isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    const user = api.getCurrentUser();
    const hasCached = Boolean(user && getUserCache<Task[]>(user.id, 'tasks')?.length);

    try {
      if (!isSilent && !hasCached) {
        setIsLoading(true);
      }
      setApiError(null);

      // Busca colunas e tarefas atualizadas em paralelo
      const [fetchedColumns, fetchedTasks] = await Promise.all([
        api.getColumns().catch(() => null),
        api.getTasks().catch(() => null),
      ]);

      if (fetchedColumns && fetchedColumns.length > 0) {
        setColumns(fetchedColumns);
        if (user) setUserCache(user.id, 'columns', fetchedColumns);
      }

      if (fetchedTasks) {
        setTasks(fetchedTasks);
        if (user) setUserCache(user.id, 'tasks', fetchedTasks);
      }
      setApiError(null);
    } catch (err: any) {
      console.warn('Backend acordando ou offline. Mantendo cache seguro local.', err);
      if (!hasCached) {
        setApiError('Servidor iniciando na nuvem. Seus dados locais continuam seguros.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Carregamento inicial em segundo plano
  useEffect(() => {
    if (isAuthenticated) {
      loadData(true);
    }
  }, [isAuthenticated, loadData]);

  // 2. SINCRONIZAÇÃO EM TEMPO REAL VIA SSE (Server-Sent Events)
  // Celular e PC atualizam instantaneamente (< 100ms) sem necessidade de F5
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const unsubscribe = api.subscribeToRealtime((event) => {
      const { type, data } = event;

      if (type === 'task_created') {
        setTasks((prev) => {
          if (prev.some((t) => t.id === data.id)) return prev;
          const updated = [data, ...prev];
          setUserCache(currentUser.id, 'tasks', updated);
          return updated;
        });
        showToast(`✨ Nova tarefa sincronizada: "${data.title}"`);
      } else if (type === 'task_updated') {
        setTasks((prev) => {
          const updated = prev.map((t) => (t.id === data.id ? { ...t, ...data } : t));
          setUserCache(currentUser.id, 'tasks', updated);
          return updated;
        });
      } else if (type === 'task_completed') {
        setTasks((prev) => {
          const completedId = data.completedTask?.id || data.id;
          let updated = prev.map((t) => (t.id === completedId ? (data.completedTask || data) : t));
          if (data.nextTask && !updated.some((t) => t.id === data.nextTask.id)) {
            updated = [data.nextTask, ...updated];
          }
          setUserCache(currentUser.id, 'tasks', updated);
          return updated;
        });
      } else if (type === 'task_deleted') {
        setTasks((prev) => {
          const updated = prev.filter((t) => t.id !== data.id);
          setUserCache(currentUser.id, 'tasks', updated);
          return updated;
        });
        if (selectedTaskId === data.id) setSelectedTaskId(null);
      } else if (type === 'columns_updated') {
        loadData(true);
      }
    });

    return unsubscribe;
  }, [isAuthenticated, currentUser, loadData, selectedTaskId]);

  // 3. Sincronização de segurança periódica (Polling a cada 8s como fallback)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadData(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadData]);

  // 4. Sincronização imediata ao desbloquear celular ou alternar abas no PC (focus/visibility)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleSyncOnFocus = () => {
      loadData(true);
    };

    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleSyncOnFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleSyncOnFocus);
    };
  }, [isAuthenticated, loadData]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    const cachedTasks = getUserCache<Task[]>(user.id, 'tasks');
    const cachedCols = getUserCache<ColumnList[]>(user.id, 'columns');
    if (cachedTasks && cachedTasks.length > 0) setTasks(cachedTasks);
    if (cachedCols && cachedCols.length > 0) setColumns(cachedCols);
    showToast(`Bem-vindo de volta, ${user.name}!`);
    loadData(true);
  };

  const handleLogout = () => {
    // Limpa imediatamente todo o cache para segurança total contra vazamento de dados
    if (currentUser) {
      clearUserCache(currentUser.id);
    }
    clearUserCache();
    api.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setTasks([]);
    setColumns(INITIAL_DEFAULT_COLUMNS);
    showToast('Você saiu com segurança.');
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Filtragem para o Modo Lista
  const filteredTasks = tasks.filter((task) => {
    if (currentList === 'my_day') return task.list_type === 'my_day';
    if (currentList === 'planned') {
      return task.list_type === 'planned' || task.due_date !== null;
    }
    return task.list_type === currentList;
  });

  // Contadores para o menu lateral
  const taskCounts: Record<string, number> = {};
  columns.forEach((col) => {
    if (col.slug === 'planned') {
      taskCounts[col.slug] = tasks.filter((t) => !t.is_completed && (t.list_type === 'planned' || t.due_date !== null)).length;
    } else {
      taskCounts[col.slug] = tasks.filter((t) => !t.is_completed && t.list_type === col.slug).length;
    }
  });

  // --- AÇÕES DE TAREFAS ---
  const handleOpenFullCreate = (initialList?: ListType) => {
    setCreateTaskInitialList(initialList || currentList);
    setIsCreateTaskModalOpen(true);
  };

  const handleCreateFullTask = async (taskData: CreateTaskDTO) => {
    try {
      const newTask = await api.createTask(taskData);
      setTasks((prev) => [newTask, ...prev]);
      showToast('Cartão criado com sucesso!');
    } catch {
      const mockTask: Task = {
        id: generateUUID(),
        title: taskData.title,
        description: taskData.description || null,
        list_type: taskData.list_type || currentList,
        due_date: taskData.due_date || null,
        is_completed: false,
        recurrence_rule: taskData.recurrence_rule || null,
        subtasks: taskData.subtasks || [],
        parent_task_id: null,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((prev) => [mockTask, ...prev]);
      showToast('Cartão salvo localmente!');
    }
  };

  const handleAddTask = async (
    title: string,
    listType: ListType,
    dueDate?: string | null,
    recurrence?: RecurrenceRule | null
  ) => {
    try {
      const newTask = await api.createTask({
        title,
        list_type: listType,
        due_date: dueDate || null,
        recurrence_rule: recurrence || null,
      });

      setTasks((prev) => [newTask, ...prev]);
      showToast('Tarefa criada com sucesso!');
    } catch {
      const mockTask: Task = {
        id: generateUUID(),
        title,
        description: null,
        list_type: listType,
        due_date: dueDate || null,
        is_completed: false,
        recurrence_rule: recurrence || null,
        parent_task_id: null,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((prev) => [mockTask, ...prev]);
      showToast('Tarefa adicionada localmente!');
    }
  };

  const handleUpdateTask = async (id: string, updates: UpdateTaskDTO) => {
    try {
      const updated = await api.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showToast('Tarefa atualizada!');
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
              ...t,
              ...updates,
              updated_at: new Date().toISOString(),
            }
            : t
        )
      );
      showToast('Alteração salva localmente!');
    }
  };

  const handleToggleComplete = async (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Feedback háptico tátil no celular
    triggerHaptic(40);

    try {
      const response = await api.completeTask(task.id, task.is_completed);

      setTasks((prev) => {
        let updated = prev.map((t) => (t.id === task.id ? response.completedTask : t));
        if (response.nextTask) {
          updated = [response.nextTask, ...updated];
        }
        return updated;
      });

      if (response.nextTask) {
        showToast(
          `🎉 Concluída! Próxima repetição agendada para ${new Date(
            response.nextTask.due_date!
          ).toLocaleDateString('pt-BR')}`
        );
      } else {
        showToast(task.is_completed ? 'Tarefa desmarcada' : 'Tarefa concluída!');
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
              ...t,
              is_completed: !t.is_completed,
              completed_at: !t.is_completed ? new Date().toISOString() : null,
            }
            : t
        )
      );
    }
  };

  // Solicitar exclusão com modal visual
  const handleRequestDeleteTask = (id: string, title?: string) => {
    const task = tasks.find((t) => t.id === id);
    setDeleteTaskModal({
      isOpen: true,
      taskId: id,
      taskTitle: title || task?.title || 'este cartão',
    });
  };

  // Confirmar exclusão efetiva (API + State)
  const handleConfirmDeleteTask = async () => {
    if (!deleteTaskModal.taskId) return;
    const id = deleteTaskModal.taskId;
    setDeleteTaskModal({ isOpen: false, taskId: null, taskTitle: null });

    try {
      await api.deleteTask(id);
    } catch (err) {
      console.warn('Exclusão backend falhou, removendo da memória local:', err);
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    showToast('Cartão excluído com sucesso');
  };

  // --- DRAG AND DROP (ESTILO TRELLO) ---
  const handleMoveTask = async (taskId: string, targetSlug: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.list_type === targetSlug) return;

    // Atualização otimista imediata na UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, list_type: targetSlug } : t))
    );

    try {
      await api.updateTask(taskId, { list_type: targetSlug });
      const targetColName = columns.find((c) => c.slug === targetSlug)?.name || targetSlug;
      showToast(`Card movido para "${targetColName}"!`);
    } catch (err) {
      console.error('Falha ao mover tarefa no backend:', err);
    }
  };

  // --- GERENCIAMENTO DE COLUNAS / LISTAS ---
  const handleSaveColumn = async (name: string, color: string) => {
    if (columnToEdit) {
      // Atualizar coluna existente
      try {
        const updated = await api.updateColumn(columnToEdit.id, { name, color });
        setColumns((prev) => prev.map((c) => (c.id === columnToEdit.id ? updated : c)));
        showToast('Coluna atualizada com sucesso!');
      } catch {
        setColumns((prev) =>
          prev.map((c) => (c.id === columnToEdit.id ? { ...c, name, color } : c))
        );
        showToast('Coluna atualizada localmente!');
      }
    } else {
      // Criar nova coluna
      try {
        const created = await api.createColumn({ name, color });
        setColumns((prev) => [...prev, created]);
        showToast(`Coluna "${name}" criada com sucesso!`);
      } catch {
        const slug = name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-') || `col-${Date.now()}`;

        const mockCol: ColumnList = {
          id: generateUUID(),
          name,
          slug,
          color,
          icon: 'Folder',
          position: columns.length,
          is_system: false,
        };
        setColumns((prev) => [...prev, mockCol]);
        showToast(`Coluna "${name}" criada localmente!`);
      }
    }
    setColumnToEdit(null);
  };

  const handleRequestDeleteColumn = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return;
    if (col.is_system) {
      showToast('Colunas nativas do sistema não podem ser excluídas');
      return;
    }
    setColumnToDelete(col);
  };

  const handleConfirmDeleteColumn = async () => {
    if (!columnToDelete) return;
    const col = columnToDelete;
    setColumnToDelete(null);

    try {
      await api.deleteColumn(col.id);
    } catch {
      // ignore
    }

    // Move tarefas da coluna excluída para o backlog
    setTasks((prev) =>
      prev.map((t) => (t.list_type === col.slug ? { ...t, list_type: 'backlog' } : t))
    );
    setColumns((prev) => prev.filter((c) => c.id !== col.id));

    if (currentList === col.slug) {
      setCurrentList('backlog');
    }

    showToast(`Coluna "${col.name}" excluída.`);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f8] text-gray-900 select-none">
      {/* Coluna 1: Sidebar de Navegação */}
      <Sidebar
        currentList={currentList}
        columns={columns}
        onSelectList={(list) => {
          setCurrentList(list);
          setSelectedTaskId(null);
        }}
        taskCounts={taskCounts}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenCreateColumn={() => {
          setColumnToEdit(null);
          setIsColumnModalOpen(true);
        }}
        onOpenCreateTask={() => handleOpenFullCreate()}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenEmailIntegration={() => setIsEmailModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Coluna 2: Conteúdo Central (Lista ou Quadro Kanban Trello) */}
      <div className="flex-1 flex flex-col h-full min-w-[280px] overflow-hidden">
        {/* Banner informativo de modo Offline */}
        {apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => loadData(false)}
              className="flex items-center gap-1 font-bold text-amber-900 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar reconectar
            </button>
          </div>
        )}

        {/* Notificação Flutuante (Toast) */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl transition-all duration-300 animate-bounce">
            {notification}
          </div>
        )}

        {viewMode === 'list' ? (
          <TaskList
            currentList={currentList}
            tasks={filteredTasks}
            selectedTask={selectedTask}
            isLoading={isLoading}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            onToggleComplete={handleToggleComplete}
            onAddTask={handleAddTask}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onDeleteTask={handleRequestDeleteTask}
            onOpenFullCreate={() => handleOpenFullCreate(currentList)}
          />
        ) : (
          <KanbanBoard
            columns={columns}
            tasks={tasks}
            selectedTask={selectedTask}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            onToggleComplete={handleToggleComplete}
            onMoveTask={handleMoveTask}
            onAddTaskToColumn={(title, slug) => handleAddTask(title, slug)}
            onOpenCreateColumn={() => {
              setColumnToEdit(null);
              setIsColumnModalOpen(true);
            }}
            onEditColumn={(col) => {
              setColumnToEdit(col);
              setIsColumnModalOpen(true);
            }}
            onDeleteColumn={handleRequestDeleteColumn}
            onDeleteTask={handleRequestDeleteTask}
            onOpenFullCreate={(colSlug) => handleOpenFullCreate(colSlug as ListType)}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />
        )}
      </div>

      {/* Coluna 3: Painel Lateral de Detalhes da Tarefa */}
      {selectedTask && (
        <TaskDetailPane
          task={selectedTask}
          columns={columns}
          onClose={() => setSelectedTaskId(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleRequestDeleteTask}
          onToggleComplete={(task) => handleToggleComplete(task)}
        />
      )}

      {/* Modal para Adicionar / Editar Colunas */}
      <ColumnModal
        isOpen={isColumnModalOpen}
        columnToEdit={columnToEdit}
        onClose={() => {
          setIsColumnModalOpen(false);
          setColumnToEdit(null);
        }}
        onSave={handleSaveColumn}
      />

      {/* Modal de Confirmação para Excluir Cartão / Tarefa */}
      <DeleteConfirmModal
        isOpen={deleteTaskModal.isOpen}
        title="Excluir Cartão?"
        itemTitle={deleteTaskModal.taskTitle || undefined}
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => setDeleteTaskModal({ isOpen: false, taskId: null, taskTitle: null })}
      />

      {/* Modal de Confirmação para Excluir Coluna */}
      <DeleteConfirmModal
        isOpen={Boolean(columnToDelete)}
        title="Excluir Coluna?"
        message={`Tem certeza que deseja excluir a coluna "${columnToDelete?.name}"? Os cartões dela serão movidos com segurança para o Backlog.`}
        onConfirm={handleConfirmDeleteColumn}
        onCancel={() => setColumnToDelete(null)}
      />

      {/* Modal Completo para Criar Tarefa com TODAS as Opções */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        columns={columns}
        defaultList={createTaskInitialList}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreateTask={handleCreateFullTask}
      />

      {/* Modal de Alteração de Senha do Usuário */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccessToast={(msg) => showToast(msg)}
      />

      {/* Modal de Instalação no Celular & Notificações com Vibração */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
      />

      {/* Modal de Integração de E-mail Direta (IMAP Multi-Usuário) */}
      <EmailIntegrationModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onTasksImported={() => {
          loadData(true);
        }}
        showToast={showToast}
      />

      {/* Botão Flutuante (FAB) para Celular / Mobile */}
      <button
        type="button"
        onClick={() => handleOpenFullCreate()}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xl shadow-blue-500/40 flex items-center justify-center transition-all"
        title="Criar novo cartão com todas as opções"
        aria-label="Criar novo cartão"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}

export default App;
