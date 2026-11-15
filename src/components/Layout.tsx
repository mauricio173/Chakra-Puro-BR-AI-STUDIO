import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  TrendingUp,
  FileText,
  Image,
  Video,
  Mic,
  Sparkles,
  SearchCheck,
  BarChart3,
  Users,
  Bookmark,
  FileDown,
  Settings,
  Bell,
  Play,
  Pause,
  Square,
  Menu,
  X,
  Loader2,
  User,
  Cpu,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { AiUsageLedger, ModuleId, Project } from '../types/studio';
import { evaluateBriefing, YOUTUBE_CREATE_LIMIT } from '../utils/validation';
import {
  ExecutionMode,
  PIPELINE_STEPS_DEF,
  PipelineStepState,
} from '../services/pipelineRunner';

const NAV_ITEMS: Array<{ id: ModuleId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { id: 'new-project', label: 'Novo projeto', icon: <PlusCircle size={17} /> },
  { id: 'projects', label: 'Meus projetos', icon: <FolderKanban size={17} /> },
  { id: 'trends', label: 'Pesquisa de tendências', icon: <TrendingUp size={17} /> },
  { id: 'scriptwriter', label: 'Roteirista IA', icon: <FileText size={17} /> },
  { id: 'images', label: 'Gerador de imagens', icon: <Image size={17} /> },
  { id: 'videos', label: 'Gerador de vídeos', icon: <Video size={17} /> },
  { id: 'narration', label: 'Narração', icon: <Mic size={17} /> },
  { id: 'thumbnail', label: 'Thumbnail', icon: <Sparkles size={17} /> },
  { id: 'seo', label: 'SEO e Qualidade', icon: <SearchCheck size={17} /> },
  { id: 'analytics', label: 'Análise de desempenho', icon: <BarChart3 size={17} /> },
  { id: 'characters', label: 'Biblioteca de personagens', icon: <Users size={17} /> },
  { id: 'prompts', label: 'Biblioteca de prompts', icon: <Bookmark size={17} /> },
  { id: 'exports', label: 'Exportações', icon: <FileDown size={17} /> },
  { id: 'settings', label: 'Configurações', icon: <Settings size={17} /> },
];

const WORKFLOW_MODULES: Array<{ id: ModuleId; label: string }> = [
  { id: 'new-project', label: '1. Briefing' },
  { id: 'trends', label: '2. Tendências' },
  { id: 'scriptwriter', label: '3. Roteiro & Cenas' },
  { id: 'images', label: '4. Imagens' },
  { id: 'videos', label: '5. Vídeos' },
  { id: 'narration', label: '6. Narração' },
  { id: 'thumbnail', label: '7. Thumbnail' },
  { id: 'seo', label: '8. SEO & QA' },
  { id: 'exports', label: '9. Exportar' },
];

export interface StudioNotification {
  id: string;
  text: string;
  type: 'info' | 'ok' | 'err';
  time: string;
}

interface LayoutProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  activeProject?: Project;
  isProcessing: boolean;
  processingLabel: string;
  aiUsage: AiUsageLedger;
  unresolvedErrorCount: number;
  onOpenDiagnostics: () => void;
  notifications: StudioNotification[];
  onClearNotifications: () => void;
  onOpenPipeline: () => void;
  children: React.ReactNode;
}

function isStepComplete(project: Project, mod: ModuleId): boolean {
  switch (mod) {
    case 'new-project':
      return evaluateBriefing(project.briefing).status === 'Pronto para produção';
    case 'trends':
      return project.trendSearches.length > 0;
    case 'scriptwriter':
      return project.scriptVersions.length > 0 && project.scenes.length > 0;
    case 'images':
      return (
        project.scenes.length > 0 &&
        project.scenes.every((s) => Boolean(project.imagePromptsByScene[s.id]?.[0]?.fullPrompt))
      );
    case 'videos':
      return (
        project.scenes.length > 0 &&
        project.scenes.every(
          (s) =>
            project.animationPromptsByScene[s.id]?.approved &&
            (project.animationPromptsByScene[s.id]?.charCount ?? 999) <= YOUTUBE_CREATE_LIMIT
        )
      );
    case 'narration':
      return project.narrationSegments.length > 0;
    case 'thumbnail':
      return project.thumbnailVariations.length > 0;
    case 'seo':
      return Boolean(project.seo?.selectedTitle && project.qualityReport);
    case 'exports':
      return (project.exportedDocsCount || 0) > 0;
    default:
      return false;
  }
}

export const Layout: React.FC<LayoutProps> = ({
  activeModule,
  onSelectModule,
  activeProject,
  isProcessing,
  processingLabel,
  aiUsage,
  unresolvedErrorCount,
  onOpenDiagnostics,
  notifications,
  onClearNotifications,
  onOpenPipeline,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const showStepper =
    Boolean(activeProject) && WORKFLOW_MODULES.some((m) => m.id === activeModule);

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F4F8] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-[#111118] border-r border-[#242434] flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-[#242434] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-wide text-white whitespace-nowrap">
              CHAKRA PURO BR
            </div>
            <div className="text-[11px] text-[#A855F7] tracking-widest uppercase">
              AI Video Studio
            </div>
          </div>
          <button
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 border-b border-[#242434]">
          <button
            onClick={() => {
              onOpenPipeline();
              setSidebarOpen(false);
            }}
            className="w-full py-2.5 px-3 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play size={14} />
            GERAR PRODUÇÃO COMPLETA
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectModule(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                  active
                    ? 'bg-[#8B5CF6]/15 text-white border border-[#A855F7]/40 font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={active ? 'text-[#A855F7]' : 'text-gray-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#242434]">
          <button
            onClick={() => {
              onOpenDiagnostics();
              setSidebarOpen(false);
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#16161F] border border-[#242434] hover:border-[#A855F7]/50 text-left space-y-1 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                <Cpu size={13} className="text-[#A855F7]" /> Créditos & IA
              </span>
              {unresolvedErrorCount > 0 && (
                <span className="text-red-400 font-mono-num font-semibold">
                  {unresolvedErrorCount} erro(s)
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono-num text-gray-400">
              {aiUsage.totalTokens.toLocaleString('pt-BR')} tokens · {aiUsage.totalRequests} req
            </div>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-[#111118]/95 backdrop-blur border-b border-[#242434] px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 rounded-lg border border-[#242434] text-gray-300 hover:text-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="text-gray-500 hidden sm:inline whitespace-nowrap">
                Projeto:
              </span>
              <span className="font-display font-semibold text-base text-white truncate max-w-[180px] sm:max-w-[320px]">
                {activeProject
                  ? activeProject.briefing.identification.projectName
                  : 'Nenhum selecionado'}
              </span>
              {activeProject && (
                <span className="hidden md:inline text-xs text-gray-400 font-mono-num whitespace-nowrap">
                  · {activeProject.completionPercent}%
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-[#C084FC] whitespace-nowrap mr-1">
                <Loader2 size={14} className="animate-spin" />
                <span className="hidden md:inline">{processingLabel || 'Processando...'}</span>
              </div>
            )}

            <button
              onClick={onOpenDiagnostics}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
                unresolvedErrorCount > 0
                  ? 'border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                  : 'border-[#242434] bg-[#16161F] text-gray-200 hover:border-[#A855F7]/50'
              }`}
              title="Ver uso de tokens, créditos dos modelos e diagnóstico de erros"
            >
              {unresolvedErrorCount > 0 ? (
                <AlertTriangle size={14} className="text-red-400" />
              ) : (
                <Cpu size={14} className="text-[#A855F7]" />
              )}
              <span className="hidden sm:inline">IA & Diagnóstico</span>
              <span className="font-mono-num text-gray-400">
                {unresolvedErrorCount > 0
                  ? `${unresolvedErrorCount} erro(s)`
                  : `${aiUsage.totalTokens.toLocaleString('pt-BR')} tok`}
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="p-2 rounded-lg border border-[#242434] bg-[#16161F] text-gray-300 hover:text-white hover:border-[#A855F7]/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                aria-label="Notificações"
              >
                <Bell size={16} />
                <span className="text-xs font-mono-num">{notifications.length}</span>
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#16161F] border border-[#242434] rounded-xl p-4 shadow-2xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#242434]">
                    <span className="text-sm font-semibold">Notificações</span>
                    <button
                      onClick={onClearNotifications}
                      className="text-xs text-gray-400 hover:text-white cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-[#242434]">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 text-center">
                        Nenhuma notificação recente.
                      </p>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <div key={n.id} className="py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between text-gray-400">
                            <span
                              className={
                                n.type === 'err'
                                  ? 'text-red-400 font-medium'
                                  : n.type === 'ok'
                                    ? 'text-emerald-400 font-medium'
                                    : 'text-[#C084FC] font-medium'
                              }
                            >
                              {n.type === 'err' ? 'Erro' : n.type === 'ok' ? 'Concluído' : 'Info'}
                            </span>
                            <span className="font-mono-num">{n.time}</span>
                          </div>
                          <p className="text-gray-200 leading-relaxed">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectModule('settings')}
              className="p-2 rounded-lg border border-[#242434] bg-[#16161F] text-gray-300 hover:text-white hover:border-[#A855F7]/50 transition-colors cursor-pointer"
              aria-label="Configurações"
            >
              <Settings size={16} />
            </button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#242434] text-xs text-gray-300 whitespace-nowrap">
              <User size={15} className="text-[#A855F7]" />
              <span>Estúdio BR</span>
            </div>
          </div>
        </header>

        {showStepper && activeProject && (
          <div className="bg-[#0D0D14] border-b border-[#242434] px-4 lg:px-8 py-2.5 overflow-x-auto">
            <div className="max-w-[1440px] mx-auto flex items-center gap-1.5 min-w-max">
              {WORKFLOW_MODULES.map((step) => {
                const isCurrent = activeModule === step.id;
                const done = isStepComplete(activeProject, step.id);
                return (
                  <button
                    key={step.id}
                    onClick={() => onSelectModule(step.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      isCurrent
                        ? 'bg-[#8B5CF6] text-white'
                        : done
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-[#16161F] text-gray-400 border border-[#242434] hover:text-white'
                    }`}
                  >
                    {done && !isCurrent && <Check size={11} />}
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

interface PipelineModalProps {
  open: boolean;
  onClose: () => void;
  running: boolean;
  paused: boolean;
  steps: PipelineStepState[];
  mode: ExecutionMode;
  setMode: (m: ExecutionMode) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onStart: () => void;
  onPauseResume: () => void;
  onCancel: () => void;
}

export const PipelineModal: React.FC<PipelineModalProps> = ({
  open,
  onClose,
  running,
  paused,
  steps,
  mode,
  setMode,
  selectedIds,
  setSelectedIds,
  onStart,
  onPauseResume,
  onCancel,
}) => {
  if (!open) return null;

  const modes: Array<{ id: ExecutionMode; label: string }> = [
    { id: 'complete', label: 'Produção completa (todas as etapas)' },
    { id: 'custom', label: 'Produção personalizada (escolher etapas)' },
    { id: 'script_only', label: 'Apenas roteiro e divisão em cenas' },
    { id: 'images_only', label: 'Apenas prompts de imagens Gemini' },
    { id: 'animations_only', label: 'Apenas prompts de animação YouTube Create' },
    { id: 'narration_only', label: 'Apenas narração ElevenLabs' },
    { id: 'thumbnail_only', label: 'Apenas thumbnail' },
    { id: 'seo_only', label: 'Apenas SEO e metadados' },
    { id: 'docs_only', label: 'Apenas verificação QA e exportação DOCX/XLSX' },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111118] border border-[#242434] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#242434] pb-3">
          <div>
            <h2 className="text-xl font-bold">Assistente de Produção Automatizada</h2>
            <p className="text-xs text-gray-400">
              Execute todo o fluxo ou apenas etapas específicas preservando resultados anteriores.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="p-2 rounded-lg border border-[#242434] text-gray-400 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-300">Modo de execução</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ExecutionMode)}
            disabled={running}
            className="w-full bg-[#0D0D14] border border-[#242434] rounded-lg px-3 py-2.5 text-sm text-white"
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {mode === 'custom' && !running && (
          <div className="border border-[#242434] rounded-lg p-4 bg-[#16161F]">
            <p className="text-xs text-gray-400 mb-3">Selecione as etapas para executar:</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {PIPELINE_STEPS_DEF.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? [...selectedIds, s.id]
                          : selectedIds.filter((x) => x !== s.id)
                      )
                    }
                    className="accent-[#8B5CF6]"
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!running ? (
            <button
              onClick={onStart}
              className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Play size={15} /> Iniciar Produção
            </button>
          ) : (
            <>
              <button
                onClick={onPauseResume}
                className="px-4 py-2.5 rounded-lg bg-[#16161F] border border-[#242434] text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
                {paused ? 'Retomar' : 'Pausar'}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Square size={15} /> Cancelar
              </button>
            </>
          )}
        </div>

        <div className="divide-y divide-[#242434] border border-[#242434] rounded-lg bg-[#0D0D14]">
          {steps.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-100">{s.label}</div>
                {s.detail && <div className="text-xs text-gray-400 mt-0.5">{s.detail}</div>}
              </div>
              <span
                className={`text-xs font-mono-num shrink-0 ${
                  s.status === 'completed'
                    ? 'text-emerald-400'
                    : s.status === 'error'
                      ? 'text-red-400'
                      : s.status === 'running'
                        ? 'text-[#C084FC]'
                        : 'text-gray-500'
                }`}
              >
                {s.status === 'completed'
                  ? 'Concluído'
                  : s.status === 'error'
                    ? 'Erro'
                    : s.status === 'running'
                      ? 'Executando...'
                      : s.status === 'skipped'
                        ? 'Ignorado'
                        : 'Aguardando'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111118] border border-[#242434] rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#242434] text-sm text-gray-300 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
