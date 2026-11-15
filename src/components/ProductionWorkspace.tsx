import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Copy,
  Edit3,
  Save,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  ExternalLink,
  GitCompare,
  Scissors,
} from 'lucide-react';
import { ModuleId, Project, SceneItem, ScriptVersion, StudioSettings } from '../types/studio';
import { aiService } from '../services/aiPrompts';

const INPUT_CLASS =
  'w-full bg-[#0D0D14] border border-[#242434] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none';

function copyToClipboard(text: string, notify: (m: string, t?: 'info' | 'ok' | 'err') => void) {
  navigator.clipboard.writeText(text).then(() => notify('Copiado para a área de transferência.', 'ok'));
}

/* ==================== PESQUISA DE TENDÊNCIAS ==================== */
export const TrendsModule: React.FC<{
  project: Project;
  settings: StudioSettings;
  onUpdateProject: (p: Project) => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({ project, settings, onUpdateProject, setBusy, notify, onError }) => {
  const [query, setQuery] = useState(project.briefing.identification.mainTheme || '');
  const [anime, setAnime] = useState(project.briefing.identification.anime || '');

  const runSearch = async () => {
    if (!query.trim()) {
      notify('Informe um tema ou palavra-chave para pesquisar.', 'err');
      return;
    }
    setBusy(true, 'Pesquisando tendências com Google Search...');
    try {
      const record = await aiService.researchTrends(query, anime, settings);
      onUpdateProject({
        ...project,
        trendSearches: [record, ...project.trendSearches],
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Pesquisa de tendências realizada: "${query}"`,
          },
          ...project.history,
        ],
      });
      notify('Pesquisa de tendências concluída.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Pesquisa de Tendências', {
          actionTarget: 'settings',
          actionLabel: 'Verificar Modelo em Configurações',
        });
      } else {
        notify(e instanceof Error ? e.message : 'Erro na pesquisa de tendências.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pesquisa de Tendências</h1>
          <p className="text-xs text-gray-400 mt-1">
            Consulta fundamentada em pesquisa web real (Google Search Grounding), diferenciando fatos
            confirmados, opiniões e teorias sem inventar métricas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Anime</label>
            <input
              className={INPUT_CLASS}
              value={anime}
              onChange={(e) => setAnime(e.target.value)}
              placeholder="Ex: Solo Leveling, Naruto, Jujutsu Kaisen"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Tema / Episódio / Palavra-chave
            </label>
            <input
              className={INPUT_CLASS}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Novo arco mangá teorias"
            />
          </div>
        </div>

        <button
          onClick={runSearch}
          className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
        >
          <Search size={15} /> Pesquisar Tendências Reais
        </button>
      </div>

      {project.trendSearches.length === 0 ? (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center text-sm text-gray-400">
          Nenhuma pesquisa realizada neste projeto ainda. Informe um tema acima para consultar fontes reais.
        </div>
      ) : (
        project.trendSearches.map((tr) => (
          <div
            key={tr.id}
            className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242434] pb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Consulta: {tr.query}</h3>
                <div className="text-xs text-gray-400 font-mono-num">
                  Consultado em {new Date(tr.consultedAt).toLocaleString('pt-BR')} ·{' '}
                  {tr.sources.length} fonte(s) vinculada(s)
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#242434]">
              {tr.items.map((it, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-base font-semibold text-white">{it.topic}</div>
                    <div className="text-xs text-gray-400">
                      <span className="text-[#C084FC] font-medium">{it.anime}</span> · Potencial{' '}
                      <span className="text-gray-200">{it.editorialPotential}</span> ·{' '}
                      <span className="text-amber-300">{it.classification}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Palavra-chave: <span className="font-mono-num text-gray-200">{it.keyword}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{it.observedTrend}</p>
                  <p className="text-sm text-gray-200">
                    <span className="text-gray-400 font-medium">Abordagem sugerida: </span>
                    {it.suggestedApproach}
                  </p>
                  {it.confirmedFacts?.length > 0 && (
                    <div className="text-xs text-emerald-300/90 space-y-0.5">
                      <strong className="text-emerald-400">Fatos confirmados:</strong>{' '}
                      {it.confirmedFacts.join(' · ')}
                    </div>
                  )}
                  {it.theoriesOrOpinions?.length > 0 && (
                    <div className="text-xs text-amber-200/90 space-y-0.5">
                      <strong className="text-amber-300">Teorias / Opiniões:</strong>{' '}
                      {it.theoriesOrOpinions.join(' · ')}
                    </div>
                  )}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        onUpdateProject({
                          ...project,
                          briefing: {
                            ...project.briefing,
                            identification: {
                              ...project.briefing.identification,
                              anime: it.anime,
                              mainTheme: it.topic,
                            },
                            seo: {
                              ...project.briefing.seo,
                              primaryKeyword: it.keyword,
                            },
                          },
                        });
                        notify('Tema e palavra-chave aplicados ao Briefing.', 'ok');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 hover:border-[#A855F7]/60 cursor-pointer"
                    >
                      Aplicar tema no Briefing
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {tr.sources.length > 0 && (
              <div className="border-t border-[#242434] pt-3">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Fontes consultadas
                </div>
                <div className="flex flex-wrap gap-3">
                  {tr.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#C084FC] hover:underline flex items-center gap-1"
                    >
                      {src.title} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

/* ==================== ROTEIRISTA IA & CENAS ==================== */
export const ScriptAndScenesModule: React.FC<{
  project: Project;
  settings: StudioSettings;
  onUpdateProject: (p: Project) => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({ project, settings, onUpdateProject, setBusy, notify, onError }) => {
  const activeScript = project.scriptVersions.find(
    (s) => s.id === project.activeScriptId
  );
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(activeScript?.fullText || '');
  const [customRefine, setCustomRefine] = useState('');
  const [compareId, setCompareId] = useState<string>('');

  const handleGenerateScript = async () => {
    setBusy(true, 'Gerando roteiro em 3ª pessoa PT-BR...');
    try {
      const script = await aiService.generateScript(project.briefing, settings);
      onUpdateProject({
        ...project,
        scriptVersions: [script, ...project.scriptVersions],
        activeScriptId: script.id,
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Roteiro gerado (${script.recommendedFormat})`,
          },
          ...project.history,
        ],
      });
      setDraftText(script.fullText);
      notify('Roteiro gerado e salvo em nova versão.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Roteirista IA', {
          actionTarget: 'new-project',
          actionLabel: 'Revisar Briefing',
        });
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar roteiro.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePartialRefine = async (instruction: string) => {
    if (!activeScript || !instruction.trim()) return;
    setBusy(true, `Refinando trecho: ${instruction}...`);
    try {
      const refined = await aiService.refineScriptSection(
        activeScript,
        instruction,
        project.briefing,
        settings
      );
      onUpdateProject({
        ...project,
        scriptVersions: [refined, ...project.scriptVersions],
        activeScriptId: refined.id,
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Refino parcial de roteiro: ${instruction}`,
          },
          ...project.history,
        ],
      });
      setDraftText(refined.fullText);
      setCustomRefine('');
      notify('Nova versão refinada criada preservando histórico anterior.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Refino de Roteiro');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao refinar roteiro.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveManualEdit = () => {
    if (!activeScript) return;
    const newVersion: ScriptVersion = {
      ...activeScript,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Edição manual ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      fullText: draftText,
    };
    onUpdateProject({
      ...project,
      scriptVersions: [newVersion, ...project.scriptVersions],
      activeScriptId: newVersion.id,
      history: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action: 'Edição manual salva como nova versão do roteiro',
        },
        ...project.history,
      ],
    });
    setEditing(false);
    notify('Edição manual salva em nova versão.', 'ok');
  };

  const handleSplitScenes = async () => {
    if (!activeScript) {
      notify('Gere ou selecione um roteiro antes de dividir em cenas.', 'err');
      return;
    }
    setBusy(true, 'Dividindo roteiro em cenas de até 10 segundos...');
    try {
      const scenes = await aiService.splitScriptIntoScenes(
        activeScript,
        project.briefing,
        settings
      );
      onUpdateProject({
        ...project,
        scenes,
        history: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `Roteiro dividido em ${scenes.length} cenas (<=10s)`,
          },
          ...project.history,
        ],
      });
      notify(`${scenes.length} cenas criadas com sucesso.`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Divisão em Cenas');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao dividir cenas.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const updateScenes = (updated: SceneItem[]) => {
    const renumbered = updated.map((s, i) => ({ ...s, number: i + 1 }));
    onUpdateProject({ ...project, scenes: renumbered });
  };

  const moveScene = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= project.scenes.length) return;
    const copy = [...project.scenes];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateScenes(copy);
  };

  const addEmptyScene = () => {
    const num = project.scenes.length + 1;
    const newScene: SceneItem = {
      id: crypto.randomUUID(),
      number: num,
      startTime: '00:00',
      endTime: '00:08',
      durationSec: 8,
      narration: '',
      narrativeObjective: 'Desenvolvimento',
      visualDescription: '',
      characters: [project.briefing.identification.mainCharacter || 'Personagem'],
      emotion: project.briefing.narrationStyle.emotionalStyle,
      action: '',
      soundEffects: 'Vento ambiente',
      transition: 'Corte seco',
    };
    updateScenes([...project.scenes, newScene]);
  };

  const regenSingleScene = async (scene: SceneItem) => {
    setBusy(true, `Regenerando Cena #${scene.number}...`);
    try {
      const regenerated = await aiService.regenerateSingleScene(
        scene,
        project.briefing,
        settings
      );
      updateScenes(
        project.scenes.map((s) => (s.id === scene.id ? regenerated : s))
      );
      notify(`Cena #${scene.number} regenerada.`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, `Regenerar Cena #${scene.number}`);
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao regenerar cena.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const compareVersion = project.scriptVersions.find((v) => v.id === compareId);

  return (
    <div className="space-y-6">
      {/* Roteirista IA */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242434] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Roteirista IA</h1>
            <p className="text-xs text-gray-400 mt-1">
              Geração em Português do Brasil (3ª pessoa), diferenciação cânone vs teoria e
              versionamento completo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleGenerateScript}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} /> Gerar Novo Roteiro
            </button>
            {activeScript && (
              <>
                <button
                  onClick={() => {
                    setDraftText(activeScript.fullText);
                    setEditing((v) => !v);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 size={14} /> {editing ? 'Cancelar Edição' : 'Editar Manualmente'}
                </button>
                <button
                  onClick={() => copyToClipboard(activeScript.fullText, notify)}
                  className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-2 cursor-pointer"
                >
                  <Copy size={14} /> Copiar Roteiro
                </button>
              </>
            )}
          </div>
        </div>

        {/* Version switcher & compare */}
        {project.scriptVersions.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Versão ativa ({project.scriptVersions.length} versão(ões) salva(s))
              </label>
              <select
                className={INPUT_CLASS}
                value={project.activeScriptId || ''}
                onChange={(e) => {
                  const found = project.scriptVersions.find(
                    (v) => v.id === e.target.value
                  );
                  onUpdateProject({ ...project, activeScriptId: e.target.value });
                  if (found) setDraftText(found.fullText);
                }}
              >
                {project.scriptVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {new Date(v.createdAt).toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Comparar com versão anterior
              </label>
              <select
                className={INPUT_CLASS}
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">Sem comparação</option>
                {project.scriptVersions
                  .filter((v) => v.id !== activeScript?.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} — {new Date(v.createdAt).toLocaleString('pt-BR')}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {!activeScript ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Nenhum roteiro gerado ainda. Preencha o Briefing e clique em &ldquo;Gerar Novo
            Roteiro&rdquo;.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-gray-300 space-y-1 border-b border-[#242434] pb-3">
              <div>
                <span className="text-gray-400">Formato recomendado:</span>{' '}
                <strong className="text-[#C084FC]">{activeScript.recommendedFormat}</strong>
              </div>
              <div>
                <span className="text-gray-400">Justificativa:</span> {activeScript.justification}
              </div>
              <div>
                <span className="text-gray-400">Spoilers:</span>{' '}
                <span className="text-amber-300">{activeScript.spoilerAlert}</span>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <textarea
                  rows={10}
                  className={INPUT_CLASS}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                />
                <button
                  onClick={handleSaveManualEdit}
                  className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <Save size={14} /> Salvar Edição como Nova Versão
                </button>
              </div>
            ) : compareVersion ? (
              <div className="grid lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#C084FC] mb-2 flex items-center gap-1.5">
                    <GitCompare size={13} /> Versão Ativa: {activeScript.label}
                  </div>
                  <div className="p-4 rounded-lg bg-[#0D0D14] border border-[#242434] text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {activeScript.fullText}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2">
                    Comparada: {compareVersion.label}
                  </div>
                  <div className="p-4 rounded-lg bg-[#0D0D14] border border-[#242434] text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {compareVersion.fullText}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#0D0D14] border border-[#242434] text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {activeScript.fullText}
                </div>

                {activeScript.factVsTheoryNotes?.length > 0 && (
                  <div className="text-xs text-gray-300 space-y-1">
                    <div className="font-semibold text-gray-200">
                      Notas Cânone vs Mangá vs Teoria:
                    </div>
                    {activeScript.factVsTheoryNotes.map((n, i) => (
                      <div key={i} className="text-gray-400">
                        • {n}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Partial refinement toolbar */}
            <div className="border-t border-[#242434] pt-4 space-y-3">
              <div className="text-xs font-semibold text-gray-300">
                Ajustes Parciais (preserva o restante do roteiro)
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Aumentar suspense sem mudar os fatos',
                  'Aumentar emoção na revelação e fechamento',
                  'Reduzir duração em ~20% mantendo o gancho',
                  'Melhorar retenção nos primeiros 5 segundos',
                  'Alterar apenas o CTA final para maior engajamento',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePartialRefine(preset)}
                    className="px-3 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-300 hover:border-[#A855F7]/60 hover:text-white cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={INPUT_CLASS}
                  placeholder="Ou descreva o trecho específico para reescrever (ex: Reescreva apenas o gancho inicial)..."
                  value={customRefine}
                  onChange={(e) => setCustomRefine(e.target.value)}
                />
                <button
                  onClick={() => handlePartialRefine(customRefine)}
                  disabled={!customRefine.trim()}
                  className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                >
                  Reescrever Trecho
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divisão Automática em Cenas */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242434] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Divisão Automática em Cenas (até 10s)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {project.scenes.length} cena(s) · Duração total estimada:{' '}
              <span className="font-mono-num text-gray-200">
                {project.scenes.reduce((acc, s) => acc + s.durationSec, 0)}s
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={addEmptyScene}
              className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Adicionar Cena
            </button>
            <button
              onClick={handleSplitScenes}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
            >
              <Scissors size={14} /> Dividir Roteiro em Cenas
            </button>
          </div>
        </div>

        {project.scenes.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Clique em &ldquo;Dividir Roteiro em Cenas&rdquo; para gerar cenas sequenciais de até 10 segundos.
          </p>
        ) : (
          <div className="divide-y divide-[#242434]">
            {project.scenes.map((scene, idx) => (
              <div key={scene.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <strong className="font-display text-base text-white">
                      Cena {scene.number}
                    </strong>
                    <span className="text-xs font-mono-num text-gray-400">
                      {scene.startTime} – {scene.endTime} · {scene.durationSec}s
                    </span>
                    {scene.durationSec > 10 && (
                      <span className="text-xs text-red-400 font-medium">
                        Excede 10s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => moveScene(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded border border-[#242434] text-gray-300 disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => moveScene(idx, 1)}
                      disabled={idx === project.scenes.length - 1}
                      className="p-1.5 rounded border border-[#242434] text-gray-300 disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      onClick={() => regenSingleScene(scene)}
                      className="px-2.5 py-1.5 rounded border border-[#242434] text-xs text-gray-200 hover:border-[#A855F7]/60 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} /> Regenerar
                    </button>
                    <button
                      onClick={() =>
                        updateScenes(project.scenes.filter((s) => s.id !== scene.id))
                      }
                      className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                      title="Excluir cena"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Início</label>
                    <input
                      className={INPUT_CLASS}
                      value={scene.startTime}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id ? { ...s, startTime: e.target.value } : s
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Fim</label>
                    <input
                      className={INPUT_CLASS}
                      value={scene.endTime}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id ? { ...s, endTime: e.target.value } : s
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Duração (máx 10s)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className={INPUT_CLASS}
                      value={scene.durationSec}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id
                              ? {
                                  ...s,
                                  durationSec: Math.min(
                                    10,
                                    Math.max(1, Number(e.target.value))
                                  ),
                                }
                              : s
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Objetivo narrativo
                    </label>
                    <input
                      className={INPUT_CLASS}
                      value={scene.narrativeObjective}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id
                              ? { ...s, narrativeObjective: e.target.value }
                              : s
                          )
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Narração</label>
                    <textarea
                      rows={2}
                      className={INPUT_CLASS}
                      value={scene.narration}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id ? { ...s, narration: e.target.value } : s
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Descrição visual & Ação
                    </label>
                    <textarea
                      rows={2}
                      className={INPUT_CLASS}
                      value={scene.visualDescription}
                      onChange={(e) =>
                        updateScenes(
                          project.scenes.map((s) =>
                            s.id === scene.id
                              ? { ...s, visualDescription: e.target.value }
                              : s
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
