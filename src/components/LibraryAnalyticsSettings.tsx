import React, { useState } from 'react';
import {
  Plus,
  FolderOpen,
  Edit3,
  CopyPlus,
  Download,
  Archive,
  Trash2,
  Search,
  Copy,
  Upload,
  Sparkles,
  FileText,
  Table,
  HardDrive,
  AlertCircle,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import {
  AiUsageLedger,
  AVAILABLE_GEMINI_MODELS,
  AVAILABLE_IMAGE_MODELS,
  CharacterProfile,
  ModuleId,
  PerformanceRecord,
  Project,
  PromptTemplate,
  StudioSettings,
} from '../types/studio';
import { StoredAsset, dbService } from '../storage/db';
import { IntegrationStatusResponse, apiClient } from '../services/apiClient';
import { aiService } from '../services/aiPrompts';
import { exportProjectToDocx } from '../exporters/docxExporter';
import { exportBriefingToXlsx } from '../exporters/xlsxExporter';
import { sanitizeForBackup } from '../storage/settings';

const INPUT_CLASS =
  'w-full bg-[#0D0D14] border border-[#242434] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none';

function copyText(text: string, notify: (m: string, t?: 'info' | 'ok' | 'err') => void) {
  navigator.clipboard.writeText(text).then(() => notify('Copiado para a área de transferência.', 'ok'));
}

/* ==================== DASHBOARD ==================== */
export const DashboardModule: React.FC<{
  projects: Project[];
  performanceCount: number;
  aiUsage: AiUsageLedger;
  unresolvedErrorCount: number;
  integrations: IntegrationStatusResponse | null;
  onOpenDiagnostics: () => void;
  onNewProject: () => void;
  onOpenProject: (id: string, target?: 'briefing' | 'script') => void;
  onDuplicateProject: (p: Project) => void;
  onArchiveProject: (p: Project) => void;
  onDeleteProject: (p: Project) => void;
  onExportDocx: (p: Project) => void;
}> = ({
  projects,
  performanceCount,
  aiUsage,
  unresolvedErrorCount,
  integrations,
  onOpenDiagnostics,
  onNewProject,
  onOpenProject,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject,
  onExportDocx,
}) => {
  const totalPrompts = projects.reduce(
    (acc, p) =>
      acc +
      Object.keys(p.imagePromptsByScene).length * 2 +
      Object.keys(p.animationPromptsByScene).length,
    0
  );
  const totalExports = projects.reduce((acc, p) => acc + (p.exportedDocsCount || 0), 0);

  const kpis = [
    { label: 'Projetos totais', val: projects.length },
    {
      label: 'Em andamento',
      val: projects.filter(
        (p) => p.status === 'em_andamento' || p.status === 'rascunho' || p.status === 'revisao'
      ).length,
    },
    { label: 'Concluídos', val: projects.filter((p) => p.status === 'publicado').length },
    {
      label: 'Prontos p/ publicação',
      val: projects.filter((p) => p.status === 'pronto_publicacao').length,
    },
    { label: 'Prompts gerados', val: totalPrompts },
    { label: 'Documentos exportados', val: totalExports },
    { label: 'Publicações registradas', val: performanceCount },
  ];

  const recentProjects = [...projects]
    .filter((p) => p.status !== 'arquivado')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Painel do Estúdio</h1>
          <p className="text-sm text-gray-400 mt-1">
            Controle centralizado da produção audiovisual com IA do Chakra Puro BR.
          </p>
        </div>
        <button
          onClick={onNewProject}
          className="px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus size={17} /> NOVO PROJETO
        </button>
      </div>

      {/* 7 KPI Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-[#16161F] border border-[#242434] rounded-xl p-4 flex flex-col justify-between gap-2"
          >
            <span className="text-xs text-gray-400 leading-snug">{k.label}</span>
            <span className="font-display font-mono-num text-3xl font-bold text-white">
              {k.val}
            </span>
          </div>
        ))}
      </div>

      {/* AI Credits & Diagnostics Summary Strip */}
      <div
        className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 ${
          unresolvedErrorCount > 0
            ? 'bg-[#191116] border-red-500/45'
            : 'bg-[#16161F] border-[#242434]'
        }`}
      >
        <div className="flex items-start gap-3">
          {unresolvedErrorCount > 0 ? (
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Cpu size={18} className="text-[#A855F7] shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-white">
              {unresolvedErrorCount > 0
                ? `${unresolvedErrorCount} erro(s) aguardando correção`
                : 'Créditos das IAs & Saúde do Estúdio'}
            </div>
            <div className="text-xs text-gray-400 font-mono-num">
              Gemini: {integrations?.gemini.configured ? 'Conectado' : 'Chave ausente'} ·{' '}
              {aiUsage.totalRequests} requisição(ões) ·{' '}
              {aiUsage.totalTokens.toLocaleString('pt-BR')} tokens consumidos ·{' '}
              ElevenLabs: {integrations?.elevenlabs.configured ? 'Ativo' : 'Modo texto pronto'}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenDiagnostics}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
            unresolvedErrorCount > 0
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'border border-[#242434] bg-[#111118] text-gray-200 hover:border-[#A855F7]/60'
          }`}
        >
          {unresolvedErrorCount > 0
            ? 'Ver Erros & Como Consertar'
            : 'Detalhes de Créditos & Consumo'}
        </button>
      </div>

      {/* Recent Projects */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#242434] pb-3">
          <h2 className="text-lg font-bold text-white">Projetos Recentes</h2>
          <span className="text-xs text-gray-400 font-mono-num">
            {recentProjects.length} ativo(s)
          </span>
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-gray-400">
              Nenhum projeto ativo encontrado. Crie seu primeiro projeto para iniciar o fluxo.
            </p>
            <button
              onClick={onNewProject}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white cursor-pointer"
            >
              Criar Primeiro Projeto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#242434]">
            {recentProjects.map((p) => (
              <div
                key={p.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-[240px] flex-1 space-y-1">
                  <div className="text-base font-semibold text-white">
                    {p.briefing.identification.projectName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {p.briefing.identification.anime || 'Anime não definido'} ·{' '}
                    {p.briefing.identification.mainTheme || 'Tema não definido'} ·{' '}
                    {p.briefing.duration.videoType} (
                    <span className="font-mono-num">
                      {p.briefing.duration.desiredDurationSeconds}s
                    </span>
                    )
                  </div>
                  <div className="text-xs text-gray-500 font-mono-num">
                    Criado em {new Date(p.createdAt).toLocaleDateString('pt-BR')} · Etapa atual:{' '}
                    <span className="text-[#C084FC]">{p.currentStep}</span>
                  </div>
                </div>

                <div className="w-36 shrink-0 space-y-1">
                  <div className="flex justify-between text-xs font-mono-num text-gray-300">
                    <span>Conclusão</span>
                    <span>{p.completionPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0D0D14] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8B5CF6]"
                      style={{ width: `${p.completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onOpenProject(p.id, 'script')}
                    className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen size={13} /> Abrir
                  </button>
                  <button
                    onClick={() => onOpenProject(p.id, 'briefing')}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => onDuplicateProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <CopyPlus size={13} /> Duplicar
                  </button>
                  <button
                    onClick={() => onExportDocx(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} /> Exportar
                  </button>
                  <button
                    onClick={() => onArchiveProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Archive size={13} /> Arquivar
                  </button>
                  <button
                    onClick={() => onDeleteProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==================== MEUS PROJETOS ==================== */
export const ProjectsListModule: React.FC<{
  projects: Project[];
  activeProjectId?: string;
  onNewProject: () => void;
  onOpenProject: (id: string, target?: 'briefing' | 'script') => void;
  onDuplicateProject: (p: Project) => void;
  onArchiveProject: (p: Project) => void;
  onDeleteProject: (p: Project) => void;
  onExportDocx: (p: Project) => void;
}> = ({
  projects,
  activeProjectId,
  onNewProject,
  onOpenProject,
  onDuplicateProject,
  onArchiveProject,
  onDeleteProject,
  onExportDocx,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ativos' | 'arquivados' | 'todos'>('ativos');

  const filtered = projects.filter((p) => {
    if (filter === 'ativos' && p.status === 'arquivado') return false;
    if (filter === 'arquivados' && p.status !== 'arquivado') return false;
    const q = search.toLowerCase();
    return (
      !q ||
      p.briefing.identification.projectName.toLowerCase().includes(q) ||
      p.briefing.identification.anime.toLowerCase().includes(q) ||
      p.briefing.identification.mainTheme.toLowerCase().includes(q)
    );
  });

  const activeProj = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Meus Projetos</h1>
            <p className="text-xs text-gray-400 mt-1">
              Gerencie produções interrompidas, versões e histórico completo.
            </p>
          </div>
          <button
            onClick={onNewProject}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Novo Projeto
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              className={`${INPUT_CLASS} pl-9`}
              placeholder="Buscar por nome, anime ou tema..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-[#0D0D14] p-1 rounded-lg border border-[#242434]">
            {(['ativos', 'arquivados', 'todos'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer ${
                  filter === f ? 'bg-[#8B5CF6] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#242434]">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Nenhum projeto corresponde ao filtro selecionado.
            </p>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-white">
                    {p.briefing.identification.projectName}
                    {p.id === activeProjectId && (
                      <span className="ml-2 text-xs text-[#C084FC]">· Em edição</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {p.briefing.identification.anime || 'Sem anime'} ·{' '}
                    {p.briefing.identification.mainTheme || 'Sem tema'} · Status:{' '}
                    {p.status} · <span className="font-mono-num">{p.completionPercent}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onOpenProject(p.id, 'briefing')}
                    className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-xs font-medium text-white cursor-pointer"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={() => onDuplicateProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => onExportDocx(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    DOCX
                  </button>
                  <button
                    onClick={() => onArchiveProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-300 cursor-pointer"
                  >
                    {p.status === 'arquivado' ? 'Restaurar' : 'Arquivar'}
                  </button>
                  <button
                    onClick={() => onDeleteProject(p)}
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {activeProj && (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white">
            Histórico de Alterações — {activeProj.briefing.identification.projectName}
          </h2>
          <div className="max-h-56 overflow-y-auto divide-y divide-[#242434]">
            {activeProj.history.slice(0, 25).map((h) => (
              <div key={h.id} className="py-2 flex justify-between text-xs gap-4">
                <span className="text-gray-200">{h.action}</span>
                <span className="text-gray-500 font-mono-num shrink-0">
                  {new Date(h.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== BIBLIOTECA DE PERSONAGENS ==================== */
export const CharacterLibraryModule: React.FC<{
  characters: CharacterProfile[];
  onRefresh: () => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
}> = ({ characters, onRefresh, notify }) => {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CharacterProfile | null>(null);

  const startNew = () => {
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      anime: '',
      appearance: '',
      clothing: '',
      apparentAge: '',
      traits: '',
      expressions: '',
      palette: '',
      visualStyle: '2D Anime Cinematográfico',
      previousPrompts: [],
      updatedAt: new Date().toISOString(),
    });
  };

  const saveChar = async () => {
    if (!editing || !editing.name.trim()) {
      notify('Informe o nome do personagem.', 'err');
      return;
    }
    await dbService.saveCharacter({ ...editing, updatedAt: new Date().toISOString() });
    setEditing(null);
    onRefresh();
    notify('Ficha de personagem salva.', 'ok');
  };

  const filtered = characters.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.anime.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Biblioteca de Personagens</h1>
            <p className="text-xs text-gray-400 mt-1">
              Fichas permanentes usadas automaticamente para manter consistência visual nos prompts
              Gemini.
            </p>
          </div>
          <button
            onClick={startNew}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Novo Personagem
          </button>
        </div>

        <input
          className={INPUT_CLASS}
          placeholder="Pesquisar personagem ou anime..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {editing && (
          <div className="border-t border-[#242434] pt-4 space-y-3">
            <h3 className="text-base font-semibold text-white">Editar Ficha</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className={INPUT_CLASS}
                placeholder="Nome do personagem *"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Anime *"
                value={editing.anime}
                onChange={(e) => setEditing({ ...editing, anime: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Aparência física (cabelo, olhos, cicatrizes)"
                value={editing.appearance}
                onChange={(e) => setEditing({ ...editing, appearance: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Vestimentas"
                value={editing.clothing}
                onChange={(e) => setEditing({ ...editing, clothing: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Idade aparente"
                value={editing.apparentAge}
                onChange={(e) => setEditing({ ...editing, apparentAge: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Características marcantes"
                value={editing.traits}
                onChange={(e) => setEditing({ ...editing, traits: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Expressões típicas"
                value={editing.expressions}
                onChange={(e) => setEditing({ ...editing, expressions: e.target.value })}
              />
              <input
                className={INPUT_CLASS}
                placeholder="Paleta de cores"
                value={editing.palette}
                onChange={(e) => setEditing({ ...editing, palette: e.target.value })}
              />
              <input
                className={`${INPUT_CLASS} sm:col-span-2`}
                placeholder="Estilo visual"
                value={editing.visualStyle}
                onChange={(e) => setEditing({ ...editing, visualStyle: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveChar}
                className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white cursor-pointer"
              >
                Salvar Personagem
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#242434] text-xs text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[#242434]">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Nenhum personagem cadastrado.
            </p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="py-4 flex flex-wrap items-start justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="font-semibold text-white">
                    {c.name} <span className="text-xs text-[#C084FC]">· {c.anime}</span>
                  </div>
                  <div className="text-xs text-gray-300">
                    Aparência: {c.appearance || '—'} · Roupas: {c.clothing || '—'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Paleta: {c.palette || '—'} · Estilo: {c.visualStyle}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(c)}
                    className="px-3 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      await dbService.saveCharacter({
                        ...c,
                        id: crypto.randomUUID(),
                        name: `${c.name} (Cópia)`,
                      });
                      onRefresh();
                      notify('Personagem duplicado.', 'ok');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={async () => {
                      await dbService.deleteCharacter(c.id);
                      onRefresh();
                      notify('Personagem excluído.', 'info');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ==================== BIBLIOTECA DE PROMPTS ==================== */
export const PromptLibraryModule: React.FC<{
  prompts: PromptTemplate[];
  onRefresh: () => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
}> = ({ prompts, onRefresh, notify }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('Todos');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);

  const startNew = () =>
    setEditing({
      id: crypto.randomUUID(),
      title: '',
      category: 'Imagem',
      anime: '',
      content: '',
      tags: [],
      updatedAt: new Date().toISOString(),
    });

  const savePrompt = async () => {
    if (!editing || !editing.title.trim() || !editing.content.trim()) {
      notify('Preencha título e conteúdo do prompt.', 'err');
      return;
    }
    await dbService.savePrompt({ ...editing, updatedAt: new Date().toISOString() });
    setEditing(null);
    onRefresh();
    notify('Prompt salvo na biblioteca.', 'ok');
  };

  const filtered = prompts.filter((p) => {
    if (catFilter !== 'Todos' && p.category !== catFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.anime.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Biblioteca de Prompts</h1>
          <p className="text-xs text-gray-400 mt-1">
            Prompts reutilizáveis para Imagens, Animações, Narração, Thumbnails e SEO.
          </p>
        </div>
        <button
          onClick={startNew}
          className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> Novo Prompt
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className={`${INPUT_CLASS} flex-1 min-w-[200px]`}
          placeholder="Pesquisar prompts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${INPUT_CLASS} w-48`}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option>Todos</option>
          <option>Imagem</option>
          <option>Animação</option>
          <option>Narração</option>
          <option>Thumbnail</option>
          <option>SEO</option>
        </select>
      </div>

      {editing && (
        <div className="border-t border-[#242434] pt-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              className={INPUT_CLASS}
              placeholder="Título *"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <select
              className={INPUT_CLASS}
              value={editing.category}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  category: e.target.value as PromptTemplate['category'],
                })
              }
            >
              <option>Imagem</option>
              <option>Animação</option>
              <option>Narração</option>
              <option>Thumbnail</option>
              <option>SEO</option>
            </select>
            <input
              className={INPUT_CLASS}
              placeholder="Anime"
              value={editing.anime}
              onChange={(e) => setEditing({ ...editing, anime: e.target.value })}
            />
          </div>
          <textarea
            rows={4}
            className={INPUT_CLASS}
            placeholder="Texto completo do prompt *"
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={savePrompt}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white cursor-pointer"
            >
              Salvar
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[#242434] text-xs text-gray-300 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-[#242434]">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Nenhum prompt encontrado.
          </p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-white">{p.title}</strong>{' '}
                  <span className="text-xs text-[#C084FC]">
                    · {p.category} {p.anime ? `· ${p.anime}` : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyText(p.content, notify)}
                    className="px-2.5 py-1 rounded border border-[#242434] text-xs text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                  <button
                    onClick={() => setEditing(p)}
                    className="px-2.5 py-1 rounded border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      await dbService.savePrompt({
                        ...p,
                        id: crypto.randomUUID(),
                        title: `${p.title} (Cópia)`,
                      });
                      onRefresh();
                      notify('Prompt duplicado.', 'ok');
                    }}
                    className="px-2.5 py-1 rounded border border-[#242434] text-xs text-gray-200 cursor-pointer"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={async () => {
                      await dbService.deletePrompt(p.id);
                      onRefresh();
                      notify('Prompt excluído.', 'info');
                    }}
                    className="px-2.5 py-1 rounded border border-red-500/30 text-xs text-red-400 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{p.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ==================== ANÁLISE DE DESEMPENHO ==================== */
export const PerformanceAnalyticsModule: React.FC<{
  records: PerformanceRecord[];
  settings: StudioSettings;
  integrations: IntegrationStatusResponse | null;
  onRefresh: () => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({ records, settings, integrations, onRefresh, setBusy, notify, onError }) => {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [form, setForm] = useState<Omit<PerformanceRecord, 'id'>>({
    videoTitle: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    views: 0,
    engagedViews: 0,
    choseToWatchPct: 0,
    swipedAwayPct: 0,
    retentionPct: 0,
    avgDurationSec: 0,
    avgPercentageViewed: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    subscribersGained: 0,
    revenueUsd: 0,
    rpmUsd: 0,
  });

  const addRecord = async () => {
    if (!form.videoTitle.trim()) {
      notify('Informe o título do vídeo publicado.', 'err');
      return;
    }
    await dbService.savePerformance({ id: crypto.randomUUID(), ...form });
    setForm({ ...form, videoTitle: '' });
    onRefresh();
    notify('Métricas de publicação registradas.', 'ok');
  };

  const handleCsvImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        notify('Arquivo CSV vazio ou inválido.', 'err');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (!cols[0]) continue;
        const getNum = (keys: string[]) => {
          const idx = headers.findIndex((h) => keys.some((k) => h.includes(k)));
          return idx >= 0 ? Number(cols[idx]) || 0 : 0;
        };
        const titleIdx = headers.findIndex(
          (h) => h.includes('title') || h.includes('título') || h.includes('video')
        );
        await dbService.savePerformance({
          id: crypto.randomUUID(),
          videoTitle: titleIdx >= 0 ? cols[titleIdx] : cols[0],
          publishedAt: new Date().toISOString().slice(0, 10),
          views: getNum(['view', 'visualiza']),
          engagedViews: getNum(['engaged', 'engajada']),
          choseToWatchPct: getNum(['chose', 'assistir']),
          swipedAwayPct: getNum(['swiped', 'desliz']),
          retentionPct: getNum(['retention', 'reten']),
          avgDurationSec: getNum(['duration', 'dura']),
          avgPercentageViewed: getNum(['percentage', 'percentual']),
          likes: getNum(['like', 'curtid']),
          comments: getNum(['comment', 'coment']),
          shares: getNum(['share', 'compart']),
          subscribersGained: getNum(['subscrib', 'inscrit']),
          revenueUsd: getNum(['revenue', 'receita']),
          rpmUsd: getNum(['rpm']),
        });
        imported++;
      }
      onRefresh();
      notify(`${imported} registro(s) importado(s) do CSV.`, 'ok');
    };
    reader.readAsText(file);
  };

  const runAiInsights = async () => {
    if (records.length === 0) {
      notify('Registre ao menos uma publicação antes de analisar.', 'err');
      return;
    }
    setBusy(true, 'Analisando desempenho no YouTube Studio com Gemini...');
    try {
      const text = await aiService.analyzePerformance(records, settings);
      setAiAnalysis(text);
      notify('Análise editorial gerada.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Análise de Desempenho IA');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao analisar desempenho.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const maxViews = Math.max(1, ...records.map((r) => r.views));

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Análise de Desempenho</h1>
            <p className="text-xs text-gray-400 mt-1">
              {integrations?.youtubeStudio.message}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <label className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-1.5 cursor-pointer">
              <Upload size={14} /> Importar CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleCsvImport(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={runAiInsights}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} /> Analisar com IA
            </button>
          </div>
        </div>

        {/* Manual Form */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-[#242434]">
          <div className="col-span-2">
            <label className="block text-[11px] text-gray-400 mb-1">Título do vídeo *</label>
            <input
              className={INPUT_CLASS}
              value={form.videoTitle}
              onChange={(e) => setForm({ ...form, videoTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Data</label>
            <input
              type="date"
              className={INPUT_CLASS}
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Visualizações</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.views}
              onChange={(e) => setForm({ ...form, views: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Views Engajadas</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.engagedViews}
              onChange={(e) => setForm({ ...form, engagedViews: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Escolheram assistir (%)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.choseToWatchPct}
              onChange={(e) => setForm({ ...form, choseToWatchPct: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Deslizaram (%)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.swipedAwayPct}
              onChange={(e) => setForm({ ...form, swipedAwayPct: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Retenção (%)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.retentionPct}
              onChange={(e) => setForm({ ...form, retentionPct: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Duração média (s)</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.avgDurationSec}
              onChange={(e) => setForm({ ...form, avgDurationSec: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">% Assistido</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.avgPercentageViewed}
              onChange={(e) =>
                setForm({ ...form, avgPercentageViewed: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Curtidas</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.likes}
              onChange={(e) => setForm({ ...form, likes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Comentários</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Compartilhamentos</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.shares}
              onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Inscritos ganhos</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={form.subscribersGained}
              onChange={(e) =>
                setForm({ ...form, subscribersGained: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Receita / RPM</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                step="0.01"
                placeholder="Receita"
                className={INPUT_CLASS}
                value={form.revenueUsd}
                onChange={(e) => setForm({ ...form, revenueUsd: Number(e.target.value) })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="RPM"
                className={INPUT_CLASS}
                value={form.rpmUsd}
                onChange={(e) => setForm({ ...form, rpmUsd: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <button
          onClick={addRecord}
          className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white cursor-pointer"
        >
          Registrar Publicação
        </button>
      </div>

      {/* Visual Chart & History */}
      {records.length > 0 && (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Histórico & Comparativo</h2>
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="space-y-1.5 pb-3 border-b border-[#242434] last:border-b-0">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong className="text-white">{r.videoTitle}</strong>
                  <div className="text-xs font-mono-num text-gray-300 flex gap-3">
                    <span>{r.views.toLocaleString('pt-BR')} views</span>
                    <span>Retenção {r.retentionPct}%</span>
                    <span>RPM {r.rpmUsd}</span>
                    <button
                      onClick={async () => {
                        await dbService.deletePerformance(r.id);
                        onRefresh();
                      }}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-[#0D0D14] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#8B5CF6]"
                    style={{ width: `${Math.round((r.views / maxViews) * 100)}%` }}
                    title={`Views: ${r.views}`}
                  />
                </div>
                <div className="text-[11px] font-mono-num text-gray-500">
                  {r.publishedAt} · Engajadas: {r.engagedViews} · Assistir: {r.choseToWatchPct}% ·
                  Deslizaram: {r.swipedAwayPct}% · Likes: {r.likes} · Inscritos: +
                  {r.subscribersGained}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-2">
          <h3 className="text-lg font-bold text-[#C084FC]">Diagnóstico Editorial da IA</h3>
          <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== EXPORTAÇÕES ==================== */
export const ExportsModule: React.FC<{
  project: Project;
  integrations: IntegrationStatusResponse | null;
  onUpdateProject: (p: Project) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({ project, integrations, onUpdateProject, notify, onError }) => {
  const handleDocx = async () => {
    try {
      const name = await exportProjectToDocx(project);
      onUpdateProject({
        ...project,
        exportedDocsCount: (project.exportedDocsCount || 0) + 1,
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Documento DOCX exportado: ${name}`,
          },
          ...project.history,
        ],
      });
      notify(`DOCX gerado: ${name}`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Exportação DOCX');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao exportar DOCX.', 'err');
      }
    }
  };

  const handleXlsx = async () => {
    try {
      const name = await exportBriefingToXlsx(project.briefing);
      onUpdateProject({
        ...project,
        exportedDocsCount: (project.exportedDocsCount || 0) + 1,
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Planilha XLSX exportada: ${name}`,
          },
          ...project.history,
        ],
      });
      notify(`XLSX gerado: ${name}`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Exportação XLSX');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao exportar XLSX.', 'err');
      }
    }
  };

  const handleGoogleSheets = async () => {
    try {
      await apiClient.exportToGoogleSheets({ projectId: project.id });
    } catch (e) {
      if (onError) {
        onError(e, 'Integração Google Sheets');
      } else {
        notify(e instanceof Error ? e.message : 'Google Sheets OAuth não configurado.', 'err');
      }
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <FileText size={22} className="text-[#A855F7]" />
          <div>
            <h2 className="text-xl font-bold text-white">Exportação Word (.DOCX)</h2>
            <p className="text-xs text-gray-400">
              CHAKRA_PURO_BR_[ANIME]_[TEMA]_PRODUCAO.docx
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Documento editável completo com fundo branco, títulos pretos, destaques amarelos, fonte
          Barlow, capa, sumário automático, numeração de páginas e todas as guias 00 a 12 com
          subguias individuais por cena.
        </p>
        <button
          onClick={handleDocx}
          className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
        >
          <Download size={14} /> Baixar Produção DOCX
        </button>
      </div>

      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Table size={22} className="text-[#A855F7]" />
          <div>
            <h2 className="text-xl font-bold text-white">Planilha Briefing (.XLSX)</h2>
            <p className="text-xs text-gray-400">
              CHAKRA_PURO_BR_BRIEFING_E_PLANEJAMENTO.xlsx
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Planilha reutilizável de 12 abas com listas suspensas, fórmulas dinâmicas, formatação
          condicional (amarelo, cinza, verde, vermelho) e compatibilidade total com Google Sheets.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleXlsx}
            className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
          >
            <Download size={14} /> Baixar Planilha XLSX
          </button>
          <button
            onClick={handleGoogleSheets}
            className="px-4 py-2.5 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 cursor-pointer"
          >
            Criar no Google Sheets
          </button>
        </div>
        {integrations && !integrations.googleSheets.configured && (
          <p className="text-xs text-amber-300/90 flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {integrations.googleSheets.message}
          </p>
        )}
      </div>
    </div>
  );
};

/* ==================== CONFIGURAÇÕES & BACKUP ==================== */
export const SettingsModule: React.FC<{
  settings: StudioSettings;
  integrations: IntegrationStatusResponse | null;
  aiUsage: AiUsageLedger;
  unresolvedErrorCount: number;
  projectsCount: number;
  onOpenDiagnostics: () => void;
  onSaveSettings: (s: StudioSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onRequestClearData: () => void;
}> = ({
  settings,
  integrations,
  aiUsage,
  unresolvedErrorCount,
  projectsCount,
  onOpenDiagnostics,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onRequestClearData,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações do Estúdio</h1>
          <p className="text-xs text-gray-400 mt-1">
            Preferências de modelos Gemini, exportação, idioma e backup local. As credenciais de
            API são protegidas exclusivamente no servidor.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Modelo Gemini (Texto / Roteiro / SEO)
            </label>
            <select
              className={INPUT_CLASS}
              value={settings.geminiModel}
              onChange={(e) =>
                onSaveSettings({ ...settings, geminiModel: e.target.value })
              }
            >
              {AVAILABLE_GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Modelo Gemini (Geração Direta de Imagens)
            </label>
            <select
              className={INPUT_CLASS}
              value={settings.geminiImageModel}
              onChange={(e) =>
                onSaveSettings({ ...settings, geminiImageModel: e.target.value })
              }
            >
              {AVAILABLE_IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Proporção padrão de novos projetos
            </label>
            <select
              className={INPUT_CLASS}
              value={settings.defaultAspectRatio}
              onChange={(e) =>
                onSaveSettings({
                  ...settings,
                  defaultAspectRatio: e.target.value as '9:16' | '16:9',
                })
              }
            >
              <option value="9:16">9:16 (Short Vertical)</option>
              <option value="16:9">16:9 (Vídeo Longo Horizontal)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Autor nas exportações
            </label>
            <input
              className={INPUT_CLASS}
              value={settings.exportAuthor}
              onChange={(e) =>
                onSaveSettings({ ...settings, exportAuthor: e.target.value })
              }
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoSaveEnabled}
            onChange={(e) =>
              onSaveSettings({ ...settings, autoSaveEnabled: e.target.checked })
            }
            className="accent-[#8B5CF6]"
          />
          Salvamento automático contínuo no IndexedDB
        </label>
      </div>

      {/* Integration readiness (transparent real server status) */}
      {integrations && (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">
              Estado das Integrações & Créditos das IAs
            </h2>
            <button
              onClick={onOpenDiagnostics}
              className="px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white cursor-pointer"
            >
              Abrir Central de Créditos & Erros ({unresolvedErrorCount} ativo(s))
            </button>
          </div>
          <div className="text-xs text-gray-300 font-mono-num">
            Consumo local registrado: {aiUsage.totalRequests} req ·{' '}
            {aiUsage.totalTokens.toLocaleString('pt-BR')} tokens ·{' '}
            {aiUsage.imageGenerations} imagem(ns) gerada(s)
          </div>
          <div className="divide-y divide-[#242434] text-xs">
            {[
              { name: 'Google Gemini API', info: integrations.gemini },
              { name: 'ElevenLabs TTS', info: integrations.elevenlabs },
              { name: 'Google Sheets OAuth', info: integrations.googleSheets },
              { name: 'YouTube Studio Analytics', info: integrations.youtubeStudio },
            ].map((row) => (
              <div
                key={row.name}
                className="py-2.5 flex flex-wrap justify-between gap-2"
              >
                <strong className="text-gray-200">{row.name}</strong>
                <span className={row.info.configured ? 'text-emerald-400' : 'text-gray-400'}>
                  {row.info.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup & Storage */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <HardDrive size={18} className="text-[#A855F7]" />
          <h2 className="text-lg font-bold text-white">Armazenamento e Backup JSON</h2>
        </div>
        <p className="text-xs text-gray-400">
          {projectsCount} projeto(s) armazenado(s) localmente em IndexedDB. Os arquivos de backup
          JSON exportados removem automaticamente quaisquer campos de credenciais sensíveis.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onExportBackup}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Exportar Backup Completo (JSON)
          </button>
          <label className="px-4 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-1.5 cursor-pointer">
            <Upload size={14} /> Importar Backup JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportBackup(f);
              }}
            />
          </label>
          <button
            onClick={onRequestClearData}
            className="px-4 py-2 rounded-lg border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            Limpar Dados Locais
          </button>
        </div>
      </div>
    </div>
  );
};
