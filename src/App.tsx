import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AiUsageLedger,
  CharacterProfile,
  DiagnosticError,
  ModuleId,
  PerformanceRecord,
  Project,
  PromptTemplate,
  StudioSettings,
} from './types/studio';
import { StoredAsset, dbService } from './storage/db';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadUsageLedger,
  resetUsageLedger,
  sanitizeForBackup,
  saveSettings,
} from './storage/settings';
import {
  calculateProjectCompletion,
  createNewProject,
} from './utils/validation';
import {
  IntegrationStatusResponse,
  apiClient,
  toDiagnosticError,
} from './services/apiClient';
import {
  ExecutionMode,
  PIPELINE_STEPS_DEF,
  PipelineController,
  PipelineStepState,
  runProductionPipeline,
} from './services/pipelineRunner';
import { exportProjectToDocx } from './exporters/docxExporter';
import {
  ConfirmModal,
  Layout,
  PipelineModal,
  StudioNotification,
} from './components/Layout';
import {
  ActiveErrorBanner,
  AiDiagnosticsModal,
} from './components/AiDiagnosticsModal';
import { BriefingForm } from './components/BriefingForm';
import {
  ScriptAndScenesModule,
  TrendsModule,
} from './components/ProductionWorkspace';
import {
  ImagesModule,
  NarrationModule,
  SeoAndQualityModule,
  ThumbnailModule,
  VideosModule,
} from './components/VisualAudioModules';
import {
  CharacterLibraryModule,
  DashboardModule,
  ExportsModule,
  PerformanceAnalyticsModule,
  ProjectsListModule,
  PromptLibraryModule,
  SettingsModule,
} from './components/LibraryAnalyticsSettings';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [settings, setSettings] = useState<StudioSettings>(() => loadSettings());
  const [integrations, setIntegrations] =
    useState<IntegrationStatusResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [notifications, setNotifications] = useState<StudioNotification[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'info' | 'ok' | 'err' } | null>(
    null
  );
  const [aiUsage, setAiUsage] = useState<AiUsageLedger>(() => loadUsageLedger());
  const [diagnosticErrors, setDiagnosticErrors] = useState<DiagnosticError[]>([]);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Pipeline automation state
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelinePaused, setPipelinePaused] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<ExecutionMode>('complete');
  const [pipelineSelectedIds, setPipelineSelectedIds] = useState<string[]>(
    PIPELINE_STEPS_DEF.map((s) => s.id)
  );
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepState[]>(
    PIPELINE_STEPS_DEF.map((s) => ({ ...s, status: 'pending' }))
  );
  const pipelineCtrlRef = useRef<PipelineController>({
    paused: false,
    cancelled: false,
  });

  const notify = useCallback(
    (text: string, type: 'info' | 'ok' | 'err' = 'info') => {
      const time = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setNotifications((prev) => [
        { id: crypto.randomUUID(), text, type, time },
        ...prev.slice(0, 29),
      ]);
      setToast({ text, type });
      setTimeout(() => {
        setToast((cur) => (cur?.text === text ? null : cur));
      }, 4500);
    },
    []
  );

  const handleReportError = useCallback(
    (
      err: unknown,
      moduleLabel: string,
      fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
    ) => {
      const diag = toDiagnosticError(err, moduleLabel, fallbackTarget);
      setDiagnosticErrors((prev) => [diag, ...prev.slice(0, 24)]);
      notify(diag.error, 'err');
    },
    [notify]
  );

  const loadAllData = useCallback(async () => {
    const [projs, chars, tpls, storedAssets, perf] = await Promise.all([
      dbService.getProjects(),
      dbService.getCharacters(),
      dbService.getPrompts(),
      dbService.getAssets(),
      dbService.getPerformance(),
    ]);
    setProjects(projs);
    setCharacters(chars);
    setPrompts(tpls);
    setAssets(storedAssets);
    setPerformance(perf);
    if (projs.length > 0 && !activeProjectId) {
      const sorted = [...projs].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
      setActiveProjectId(sorted[0].id);
    }
    setHydrated(true);
  }, [activeProjectId]);

  useEffect(() => {
    loadAllData();
    apiClient
      .getIntegrationsStatus()
      .then(setIntegrations)
      .catch(() => {});

    const onUsageUpdated = () => setAiUsage(loadUsageLedger());
    window.addEventListener('chakra-ai-usage-updated', onUsageUpdated);
    return () => window.removeEventListener('chakra-ai-usage-updated', onUsageUpdated);
  }, [loadAllData]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const persistProject = useCallback(
    async (updated: Project, silent = true) => {
      const comp = calculateProjectCompletion(updated);
      const enriched: Project = {
        ...updated,
        updatedAt: new Date().toISOString(),
        completionPercent: comp.percent,
        currentStep: comp.currentStep,
        status:
          updated.status === 'arquivado'
            ? 'arquivado'
            : comp.percent === 100
              ? 'pronto_publicacao'
              : comp.percent > 10
                ? 'em_andamento'
                : updated.status,
      };
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === enriched.id);
        return exists
          ? prev.map((p) => (p.id === enriched.id ? enriched : p))
          : [enriched, ...prev];
      });
      await dbService.saveProject(enriched);
      if (!silent) notify('Projeto salvo no IndexedDB.', 'ok');
    },
    [notify]
  );

  const handleCreateNewProject = async () => {
    const proj = createNewProject(
      `Produção Chakra Puro BR #${projects.length + 1}`,
      settings.defaultAspectRatio
    );
    await persistProject(proj, true);
    setActiveProjectId(proj.id);
    setActiveModule('new-project');
    notify('Novo projeto criado.', 'ok');
  };

  const handleDuplicateProject = async (source: Project) => {
    const now = new Date().toISOString();
    const copy: Project = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'rascunho',
      briefing: {
        ...structuredClone(source.briefing),
        identification: {
          ...source.briefing.identification,
          projectName: `${source.briefing.identification.projectName} (Cópia)`,
        },
      },
      history: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          action: `Projeto duplicado a partir de "${source.briefing.identification.projectName}"`,
        },
      ],
    };
    await persistProject(copy, true);
    setActiveProjectId(copy.id);
    notify('Projeto duplicado com sucesso.', 'ok');
  };

  const handleArchiveProject = async (p: Project) => {
    const nextStatus = p.status === 'arquivado' ? 'em_andamento' : 'arquivado';
    await persistProject({ ...p, status: nextStatus }, true);
    notify(
      nextStatus === 'arquivado' ? 'Projeto arquivado.' : 'Projeto restaurado.',
      'info'
    );
  };

  const handleDeleteProject = (p: Project) => {
    setConfirmState({
      open: true,
      title: 'Excluir Projeto',
      message: `Tem certeza que deseja excluir permanentemente "${p.briefing.identification.projectName}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        await dbService.deleteProject(p.id);
        setProjects((prev) => prev.filter((x) => x.id !== p.id));
        if (activeProjectId === p.id) setActiveProjectId('');
        setConfirmState((s) => ({ ...s, open: false }));
        notify('Projeto excluído.', 'info');
      },
    });
  };

  const handleExportDocx = async (p: Project) => {
    try {
      const name = await exportProjectToDocx(p);
      await persistProject(
        {
          ...p,
          exportedDocsCount: (p.exportedDocsCount || 0) + 1,
        },
        true
      );
      notify(`DOCX exportado: ${name}`, 'ok');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Erro ao exportar DOCX.', 'err');
    }
  };

  const startPipeline = async () => {
    if (!activeProject) {
      notify('Crie ou selecione um projeto antes de iniciar a automação.', 'err');
      return;
    }
    pipelineCtrlRef.current = { paused: false, cancelled: false };
    setPipelinePaused(false);
    setPipelineRunning(true);
    setIsProcessing(true);
    setProcessingLabel('Executando fluxo automatizado...');

    let stepHadError = false;
    try {
      const result = await runProductionPipeline({
        project: activeProject,
        mode: pipelineMode,
        selectedStepIds: pipelineSelectedIds,
        characters,
        settings,
        controller: pipelineCtrlRef.current,
        onProgress: (steps, updatedProj) => {
          setPipelineSteps(steps);
          if (settings.autoSaveEnabled) {
            persistProject(updatedProj, true);
          }
        },
        onStepError: (_stepId, stepLabel, error) => {
          stepHadError = true;
          handleReportError(error, `Automação — ${stepLabel}`);
        },
      });
      await persistProject(result, true);
      if (!stepHadError) {
        notify('Execução da linha de produção finalizada.', 'ok');
      }
    } catch (e) {
      handleReportError(e, 'Automação de Produção');
    } finally {
      setPipelineRunning(false);
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleExportBackup = () => {
    const payload = sanitizeForBackup({
      exportedAt: new Date().toISOString(),
      studio: 'CHAKRA PURO BR — AI VIDEO STUDIO',
      settings,
      projects,
      characters,
      prompts,
      performance,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CHAKRA_PURO_BR_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Backup JSON exportado (sem credenciais).', 'ok');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as {
          projects?: Project[];
          characters?: CharacterProfile[];
          prompts?: PromptTemplate[];
          performance?: PerformanceRecord[];
          settings?: StudioSettings;
        };
        for (const p of parsed.projects || []) await dbService.saveProject(p);
        for (const c of parsed.characters || []) await dbService.saveCharacter(c);
        for (const t of parsed.prompts || []) await dbService.savePrompt(t);
        for (const r of parsed.performance || []) await dbService.savePerformance(r);
        if (parsed.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...parsed.settings };
          saveSettings(merged);
          setSettings(merged);
        }
        await loadAllData();
        notify('Backup importado com sucesso!', 'ok');
      } catch {
        notify('Arquivo JSON de backup inválido.', 'err');
      }
    };
    reader.readAsText(file);
  };

  const requireProjectNotice = (
    <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center space-y-3">
      <h2 className="text-xl font-bold text-white">Nenhum projeto selecionado</h2>
      <p className="text-sm text-gray-400">
        Crie um novo projeto ou selecione um existente para utilizar este módulo.
      </p>
      <button
        onClick={handleCreateNewProject}
        className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white cursor-pointer"
      >
        Criar Novo Projeto
      </button>
    </div>
  );

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#09090D] text-gray-300 flex items-center justify-center text-sm">
        Carregando Chakra Puro BR Studio...
      </div>
    );
  }

  const unresolvedErrors = diagnosticErrors.filter((e) => !e.resolved);
  const latestActiveError = unresolvedErrors[0];

  return (
    <Layout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      activeProject={activeProject}
      isProcessing={isProcessing}
      processingLabel={processingLabel}
      aiUsage={aiUsage}
      unresolvedErrorCount={unresolvedErrors.length}
      onOpenDiagnostics={() => setDiagnosticsOpen(true)}
      notifications={notifications}
      onClearNotifications={() => setNotifications([])}
      onOpenPipeline={() => {
        if (!activeProject) {
          notify('Selecione ou crie um projeto primeiro.', 'err');
          return;
        }
        setPipelineOpen(true);
      }}
    >
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border text-xs font-medium shadow-2xl max-w-sm ${
            toast.type === 'err'
              ? 'bg-[#1f1215] border-red-500/50 text-red-200'
              : toast.type === 'ok'
                ? 'bg-[#101f17] border-emerald-500/50 text-emerald-200'
                : 'bg-[#16161F] border-[#A855F7]/50 text-gray-100'
          }`}
        >
          {toast.text}
        </div>
      )}

      {latestActiveError && (
        <ActiveErrorBanner
          error={latestActiveError}
          onDismiss={(id) =>
            setDiagnosticErrors((prev) =>
              prev.map((item) => (item.id === id ? { ...item, resolved: true } : item))
            )
          }
          onNavigate={setActiveModule}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        />
      )}

      {activeModule === 'dashboard' && (
        <DashboardModule
          projects={projects}
          performanceCount={performance.length}
          aiUsage={aiUsage}
          unresolvedErrorCount={unresolvedErrors.length}
          integrations={integrations}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onNewProject={handleCreateNewProject}
          onOpenProject={(id, target) => {
            setActiveProjectId(id);
            setActiveModule(target === 'briefing' ? 'new-project' : 'scriptwriter');
          }}
          onDuplicateProject={handleDuplicateProject}
          onArchiveProject={handleArchiveProject}
          onDeleteProject={handleDeleteProject}
          onExportDocx={handleExportDocx}
        />
      )}

      {activeModule === 'new-project' &&
        (activeProject ? (
          <BriefingForm
            briefing={activeProject.briefing}
            onChange={(updatedBriefing) =>
              persistProject({ ...activeProject, briefing: updatedBriefing }, true)
            }
            onSaveProject={() => persistProject(activeProject, false)}
            onDuplicateAsNewProject={() => handleDuplicateProject(activeProject)}
            onProceedToScript={() => setActiveModule('scriptwriter')}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'projects' && (
        <ProjectsListModule
          projects={projects}
          activeProjectId={activeProjectId}
          onNewProject={handleCreateNewProject}
          onOpenProject={(id, target) => {
            setActiveProjectId(id);
            setActiveModule(target === 'briefing' ? 'new-project' : 'scriptwriter');
          }}
          onDuplicateProject={handleDuplicateProject}
          onArchiveProject={handleArchiveProject}
          onDeleteProject={handleDeleteProject}
          onExportDocx={handleExportDocx}
        />
      )}

      {activeModule === 'trends' &&
        (activeProject ? (
          <TrendsModule
            project={activeProject}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'scriptwriter' &&
        (activeProject ? (
          <ScriptAndScenesModule
            project={activeProject}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'images' &&
        (activeProject ? (
          <ImagesModule
            project={activeProject}
            characters={characters}
            assets={assets}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            onAssetAdded={(a) => setAssets((prev) => [a, ...prev])}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'videos' &&
        (activeProject ? (
          <VideosModule
            project={activeProject}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'narration' &&
        (activeProject ? (
          <NarrationModule
            project={activeProject}
            settings={settings}
            integrations={integrations}
            onUpdateProject={(p) => persistProject(p, true)}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'thumbnail' &&
        (activeProject ? (
          <ThumbnailModule
            project={activeProject}
            assets={assets}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            onAssetAdded={(a) => setAssets((prev) => [a, ...prev])}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'seo' &&
        (activeProject ? (
          <SeoAndQualityModule
            project={activeProject}
            settings={settings}
            onUpdateProject={(p) => persistProject(p, true)}
            setBusy={(b, lbl) => {
              setIsProcessing(b);
              setProcessingLabel(lbl || '');
            }}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'analytics' && (
        <PerformanceAnalyticsModule
          records={performance}
          settings={settings}
          integrations={integrations}
          onRefresh={loadAllData}
          setBusy={(b, lbl) => {
            setIsProcessing(b);
            setProcessingLabel(lbl || '');
          }}
          notify={notify}
          onError={handleReportError}
        />
      )}

      {activeModule === 'characters' && (
        <CharacterLibraryModule
          characters={characters}
          onRefresh={loadAllData}
          notify={notify}
        />
      )}

      {activeModule === 'prompts' && (
        <PromptLibraryModule
          prompts={prompts}
          onRefresh={loadAllData}
          notify={notify}
        />
      )}

      {activeModule === 'exports' &&
        (activeProject ? (
          <ExportsModule
            project={activeProject}
            integrations={integrations}
            onUpdateProject={(p) => persistProject(p, true)}
            notify={notify}
            onError={handleReportError}
          />
        ) : (
          requireProjectNotice
        ))}

      {activeModule === 'settings' && (
        <SettingsModule
          settings={settings}
          integrations={integrations}
          aiUsage={aiUsage}
          unresolvedErrorCount={unresolvedErrors.length}
          projectsCount={projects.length}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onSaveSettings={(next) => {
            saveSettings(next);
            setSettings(next);
            notify('Configurações atualizadas.', 'ok');
          }}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onRequestClearData={() =>
            setConfirmState({
              open: true,
              title: 'Limpar Armazenamento Local',
              message:
                'Todos os projetos, personagens, prompts e métricas salvos no IndexedDB serão removidos. Faça um backup JSON antes de confirmar.',
              onConfirm: async () => {
                await dbService.clearAllData();
                setProjects([]);
                setCharacters([]);
                setPrompts([]);
                setAssets([]);
                setPerformance([]);
                setActiveProjectId('');
                setConfirmState((s) => ({ ...s, open: false }));
                notify('Armazenamento local limpo.', 'info');
              },
            })
          }
        />
      )}

      <PipelineModal
        open={pipelineOpen}
        onClose={() => setPipelineOpen(false)}
        running={pipelineRunning}
        paused={pipelinePaused}
        steps={pipelineSteps}
        mode={pipelineMode}
        setMode={setPipelineMode}
        selectedIds={pipelineSelectedIds}
        setSelectedIds={setPipelineSelectedIds}
        onStart={startPipeline}
        onPauseResume={() => {
          const next = !pipelinePaused;
          pipelineCtrlRef.current.paused = next;
          setPipelinePaused(next);
        }}
        onCancel={() => {
          pipelineCtrlRef.current.cancelled = true;
          pipelineCtrlRef.current.paused = false;
          setPipelinePaused(false);
          notify('Execução cancelada pelo usuário. Etapas já concluídas foram preservadas.', 'info');
        }}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel="Confirmar"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />

      <AiDiagnosticsModal
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        usage={aiUsage}
        settings={settings}
        integrations={integrations}
        errors={diagnosticErrors}
        onResetUsage={() => {
          setAiUsage(resetUsageLedger());
          notify('Contador local de consumo zerado.', 'info');
        }}
        onResolveError={(id) =>
          setDiagnosticErrors((prev) =>
            prev.map((item) => (item.id === id ? { ...item, resolved: true } : item))
          )
        }
        onClearErrors={() => setDiagnosticErrors([])}
        onNavigate={setActiveModule}
      />
    </Layout>
  );
}
