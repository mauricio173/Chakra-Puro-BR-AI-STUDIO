import React, { useState } from 'react';
import {
  Copy,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Volume2,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import {
  CharacterProfile,
  ModuleId,
  Project,
  SceneAnimationPrompt,
  SceneImagePrompt,
  SceneItem,
  StudioSettings,
} from '../types/studio';
import { StoredAsset, dbService } from '../storage/db';
import { IntegrationStatusResponse, apiClient } from '../services/apiClient';
import { aiService } from '../services/aiPrompts';
import {
  MANDATORY_SUBSCRIBE_URL,
  YOUTUBE_CREATE_LIMIT,
  runLocalQualityAudit,
  validateAnimationPromptLength,
} from '../utils/validation';

const INPUT_CLASS =
  'w-full bg-[#0D0D14] border border-[#242434] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none';

function copyText(text: string, notify: (m: string, t?: 'info' | 'ok' | 'err') => void) {
  navigator.clipboard.writeText(text).then(() => notify('Copiado para a área de transferência.', 'ok'));
}

/* ==================== GERADOR DE IMAGENS GEMINI ==================== */
export const ImagesModule: React.FC<{
  project: Project;
  characters: CharacterProfile[];
  assets: StoredAsset[];
  settings: StudioSettings;
  onUpdateProject: (p: Project) => void;
  onAssetAdded: (a: StoredAsset) => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({
  project,
  characters,
  assets,
  settings,
  onUpdateProject,
  onAssetAdded,
  setBusy,
  notify,
  onError,
}) => {
  const generateScenePair = async (scene: SceneItem) => {
    setBusy(true, `Gerando 2 prompts de imagem para Cena #${scene.number}...`);
    try {
      const pair = await aiService.generateImagePromptsForScene(
        scene,
        project.briefing,
        characters,
        settings
      );
      onUpdateProject({
        ...project,
        imagePromptsByScene: { ...project.imagePromptsByScene, [scene.id]: pair },
      });
      notify(`Prompts da Cena #${scene.number} gerados.`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, `Gerador de Imagens (Cena #${scene.number})`);
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar prompts.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const generateAllPrompts = async () => {
    if (project.scenes.length === 0) {
      notify('Divida o roteiro em cenas antes de gerar prompts de imagem.', 'err');
      return;
    }
    setBusy(true, 'Gerando prompts de imagem para todas as cenas...');
    try {
      const map = { ...project.imagePromptsByScene };
      for (const scene of project.scenes) {
        map[scene.id] = await aiService.generateImagePromptsForScene(
          scene,
          project.briefing,
          characters,
          settings
        );
      }
      onUpdateProject({ ...project, imagePromptsByScene: map });
      notify(`${project.scenes.length * 2} prompts de imagem gerados.`, 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Gerador de Imagens');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar prompts.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const generateDirectImage = async (sceneId: string, promptObj: SceneImagePrompt) => {
    setBusy(true, `Gerando imagem direta via Gemini (${settings.geminiImageModel})...`);
    try {
      const refAsset = assets.find((a) => a.id === promptObj.referenceImageId);
      const res = await apiClient.generateImage({
        prompt: promptObj.fullPrompt,
        aspectRatio: promptObj.aspectRatio,
        referenceImageBase64: refAsset?.base64,
        referenceMimeType: refAsset?.mimeType,
        model: settings.geminiImageModel,
      });

      const asset: StoredAsset = {
        id: crypto.randomUUID(),
        projectId: project.id,
        mimeType: res.mimeType,
        base64: res.base64,
        label: `Cena ${sceneId.slice(0, 6)} V${promptObj.variant}`,
        createdAt: new Date().toISOString(),
      };
      await dbService.saveAsset(asset);
      onAssetAdded(asset);

      const pair = project.imagePromptsByScene[sceneId];
      if (pair) {
        const updatedPair: [SceneImagePrompt, SceneImagePrompt] = [
          pair[0].id === promptObj.id ? { ...pair[0], generatedImageId: asset.id } : pair[0],
          pair[1].id === promptObj.id ? { ...pair[1], generatedImageId: asset.id } : pair[1],
        ];
        onUpdateProject({
          ...project,
          imagePromptsByScene: { ...project.imagePromptsByScene, [sceneId]: updatedPair },
        });
      }
      notify('Imagem gerada e salva no IndexedDB!', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Geração Direta de Imagem Gemini', {
          actionTarget: 'settings',
          actionLabel: 'Alterar Modelo em Configurações',
        });
      } else {
        notify(
          e instanceof Error
            ? e.message
            : 'Geração direta indisponível — copie o prompt para gerar no Gemini.',
          'err'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const attachReference = (
    sceneId: string,
    promptId: string,
    file: File | undefined
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      const asset: StoredAsset = {
        id: crypto.randomUUID(),
        projectId: project.id,
        mimeType: file.type || 'image/png',
        base64,
        label: `Ref ${file.name}`,
        createdAt: new Date().toISOString(),
      };
      await dbService.saveAsset(asset);
      onAssetAdded(asset);

      const pair = project.imagePromptsByScene[sceneId];
      if (pair) {
        const updatedPair: [SceneImagePrompt, SceneImagePrompt] = [
          pair[0].id === promptId ? { ...pair[0], referenceImageId: asset.id } : pair[0],
          pair[1].id === promptId ? { ...pair[1], referenceImageId: asset.id } : pair[1],
        ];
        onUpdateProject({
          ...project,
          imagePromptsByScene: { ...project.imagePromptsByScene, [sceneId]: updatedPair },
        });
      }
      notify('Imagem de referência anexada.', 'ok');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerador de Imagens Gemini</h1>
          <p className="text-xs text-gray-400 mt-1">
            Dois prompts independentes por cena com consistência de personagem, proporção{' '}
            {project.briefing.visualIdentity.aspectRatio} e geração direta quando disponível.
          </p>
        </div>
        <button
          onClick={generateAllPrompts}
          className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
        >
          <Sparkles size={14} /> Gerar Prompts de Todas as Cenas
        </button>
      </div>

      {project.scenes.length === 0 ? (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center text-sm text-gray-400">
          Divida o roteiro em cenas no módulo Roteirista IA antes de gerar os prompts de imagem.
        </div>
      ) : (
        project.scenes.map((scene) => {
          const pair = project.imagePromptsByScene[scene.id];
          return (
            <div
              key={scene.id}
              className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242434] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Cena {scene.number} · {scene.startTime}–{scene.endTime}
                  </h3>
                  <p className="text-xs text-gray-400">{scene.visualDescription}</p>
                </div>
                <button
                  onClick={() => generateScenePair(scene)}
                  className="px-3 py-1.5 rounded-lg border border-[#242434] bg-[#111118] text-xs text-gray-200 hover:border-[#A855F7]/60 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} /> {pair ? 'Regenerar Par' : 'Gerar 2 Prompts'}
                </button>
              </div>

              {pair ? (
                <div className="grid lg:grid-cols-2 gap-5">
                  {pair.map((p, idx) => {
                    const genAsset = assets.find((a) => a.id === p.generatedImageId);
                    const refAsset = assets.find((a) => a.id === p.referenceImageId);
                    return (
                      <div key={p.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#C084FC]">
                            Prompt {idx + 1} · {p.aspectRatio}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyText(p.fullPrompt, notify)}
                              className="px-2.5 py-1 rounded border border-[#242434] text-xs text-gray-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy size={12} /> Copiar
                            </button>
                            <button
                              onClick={() => generateDirectImage(scene.id, p)}
                              className="px-2.5 py-1 rounded bg-[#8B5CF6] text-xs font-medium text-white flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon size={12} /> Gerar no Gemini
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={5}
                          className={INPUT_CLASS}
                          value={p.fullPrompt}
                          onChange={(e) => {
                            const updated: [SceneImagePrompt, SceneImagePrompt] = [
                              idx === 0 ? { ...pair[0], fullPrompt: e.target.value } : pair[0],
                              idx === 1 ? { ...pair[1], fullPrompt: e.target.value } : pair[1],
                            ];
                            onUpdateProject({
                              ...project,
                              imagePromptsByScene: {
                                ...project.imagePromptsByScene,
                                [scene.id]: updated,
                              },
                            });
                          }}
                        />

                        <div className="text-[11px] text-gray-400">
                          {p.character} · {p.expression} · {p.angle} · {p.lighting}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="px-2.5 py-1.5 rounded border border-[#242434] bg-[#111118] text-xs text-gray-300 hover:border-[#A855F7]/60 flex items-center gap-1.5 cursor-pointer">
                            <Upload size={12} /> Anexar Referência
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                attachReference(scene.id, p.id, e.target.files?.[0])
                              }
                            />
                          </label>
                          {refAsset && (
                            <span className="text-xs text-emerald-400">
                              Ref: {refAsset.label}
                            </span>
                          )}
                        </div>

                        {genAsset && (
                          <div className="border border-[#242434] rounded-lg overflow-hidden bg-[#0D0D14]">
                            <img
                              src={`data:${genAsset.mimeType};base64,${genAsset.base64}`}
                              alt={`Cena ${scene.number} variante ${idx + 1}`}
                              className="w-full max-h-64 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Prompts ainda não gerados para esta cena.
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

/* ==================== GERADOR DE ANIMAÇÃO YOUTUBE CREATE ==================== */
export const VideosModule: React.FC<{
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
  const generateAll = async () => {
    if (project.scenes.length === 0) {
      notify('Divida o roteiro em cenas antes de gerar prompts de animação.', 'err');
      return;
    }
    setBusy(true, 'Gerando prompts YouTube Create (<= 900 chars)...');
    try {
      const map = { ...project.animationPromptsByScene };
      for (const scene of project.scenes) {
        map[scene.id] = await aiService.generateAnimationPromptForScene(
          scene,
          project.briefing,
          settings
        );
      }
      onUpdateProject({ ...project, animationPromptsByScene: map });
      notify('Prompts de animação gerados e validados.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Gerador de Animação YouTube Create');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar animações.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEditPrompt = (sceneId: string, text: string) => {
    const check = validateAnimationPromptLength(text);
    const updated: SceneAnimationPrompt = {
      sceneId,
      prompt: text,
      charCount: check.charCount,
      approved: check.valid,
      validationError: check.valid
        ? undefined
        : `Ultrapassou 900 caracteres em ${check.excess} caractere(s). Otimize antes de aprovar.`,
    };
    onUpdateProject({
      ...project,
      animationPromptsByScene: {
        ...project.animationPromptsByScene,
        [sceneId]: updated,
      },
    });
  };

  const optimizeWithAI = async (sceneId: string, currentText: string) => {
    setBusy(true, 'Otimizando prompt para caber em <= 900 caracteres...');
    try {
      const optimized = await aiService.optimizeAnimationPrompt(currentText, settings);
      handleEditPrompt(sceneId, optimized);
      notify('Prompt otimizado pela IA.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Otimização de Prompt YouTube Create');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao otimizar prompt.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gerador de Animação YouTube Create
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Regras permanentes: Trilha sonora DESATIVADA · Música DESATIVADA · Limite máximo
            rígido de 900 caracteres por cena.
          </p>
        </div>
        <button
          onClick={generateAll}
          className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
        >
          <Sparkles size={14} /> Gerar Todos os Prompts
        </button>
      </div>

      {project.scenes.length === 0 ? (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center text-sm text-gray-400">
          Divida o roteiro em cenas antes de gerar prompts de animação.
        </div>
      ) : (
        project.scenes.map((scene) => {
          const anim = project.animationPromptsByScene[scene.id];
          const charCount = anim?.charCount ?? 0;
          const overLimit = charCount > YOUTUBE_CREATE_LIMIT;

          return (
            <div
              key={scene.id}
              className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="text-base text-white">
                    Cena {scene.number} ({scene.durationSec}s)
                  </strong>
                  <span className="ml-3 text-xs text-gray-400">{scene.action}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono-num text-xs font-semibold ${
                      overLimit
                        ? 'text-red-400'
                        : charCount > 0
                          ? 'text-emerald-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {charCount}/900
                  </span>
                  {anim && !overLimit && charCount > 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Aprovado
                    </span>
                  )}
                  {overLimit && (
                    <button
                      onClick={() => optimizeWithAI(scene.id, anim.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-medium text-amber-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wand2 size={12} /> Otimizar com IA (&le;900)
                    </button>
                  )}
                  <button
                    onClick={() => anim?.prompt && copyText(anim.prompt, notify)}
                    disabled={!anim?.prompt || overLimit}
                    className="px-3 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                className={INPUT_CLASS}
                placeholder="Prompt de animação YouTube Create (sem música/trilha, máx. 900 caracteres)..."
                value={anim?.prompt || ''}
                onChange={(e) => handleEditPrompt(scene.id, e.target.value)}
              />

              {overLimit && (
                <div className="text-xs text-red-400 flex items-center gap-1.5">
                  <XCircle size={13} />
                  Aprovação bloqueada: excede o limite em {charCount - YOUTUBE_CREATE_LIMIT}{' '}
                  caractere(s). Use &ldquo;Otimizar com IA&rdquo; ou reduza manualmente.
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

/* ==================== NARRAÇÃO ELEVENLABS ==================== */
export const NarrationModule: React.FC<{
  project: Project;
  settings: StudioSettings;
  integrations: IntegrationStatusResponse | null;
  onUpdateProject: (p: Project) => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({ project, settings, integrations, onUpdateProject, setBusy, notify, onError }) => {
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  const generatePlan = async () => {
    if (project.scenes.length === 0) {
      notify('Divida o roteiro em cenas antes de preparar a narração.', 'err');
      return;
    }
    setBusy(true, 'Preparando roteiro de narração ElevenLabs...');
    try {
      const segments = await aiService.generateNarrationPlan(
        project.scenes,
        project.briefing,
        settings
      );
      onUpdateProject({ ...project, narrationSegments: segments });
      notify('Narração por cena gerada.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Preparação de Narração');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar narração.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const generateAudio = async (sceneId: string, text: string) => {
    setBusy(true, 'Gerando áudio via ElevenLabs...');
    try {
      const res = await apiClient.generateElevenLabsAudio({
        text,
        voiceId: project.briefing.narrationStyle.elevenLabsVoiceRef,
      });
      setAudioUrls((prev) => ({
        ...prev,
        [sceneId]: `data:${res.mimeType};base64,${res.base64}`,
      }));
      notify('Áudio ElevenLabs gerado com sucesso.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Narração ElevenLabs');
      } else {
        notify(e instanceof Error ? e.message : 'Integração ElevenLabs indisponível.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const fullNarration = project.narrationSegments.map((s) => s.text).join('\n\n');

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Módulo de Narração (ElevenLabs)</h1>
            <p className="text-xs text-gray-400 mt-1">
              {integrations?.elevenlabs.configured
                ? 'Integração ElevenLabs ativa no servidor.'
                : integrations?.elevenlabs.message ||
                  'Textos otimizados com intenção emocional, pausas e pronúncia prontos para uso externo.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {fullNarration && (
              <button
                onClick={() => copyText(fullNarration, notify)}
                className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={14} /> Copiar Narração Completa
              </button>
            )}
            <button
              onClick={generatePlan}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} /> Preparar Narrações
            </button>
          </div>
        </div>
      </div>

      {project.narrationSegments.length === 0 ? (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center text-sm text-gray-400">
          Clique em &ldquo;Preparar Narrações&rdquo; para gerar o texto completo e segmentado por cena.
        </div>
      ) : (
        <div className="space-y-4">
          {project.narrationSegments.map((seg) => (
            <div
              key={seg.sceneId}
              className="bg-[#16161F] border border-[#242434] rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">
                  Cena {seg.sceneNumber} ·{' '}
                  <span className="font-mono-num text-gray-400">{seg.estimatedSeconds}s</span> ·{' '}
                  <span className="text-[#C084FC]">{seg.emotionalIntent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(seg.text, notify)}
                    className="px-3 py-1.5 rounded-lg border border-[#242434] text-xs text-gray-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                  {integrations?.elevenlabs.configured && (
                    <button
                      onClick={() => generateAudio(seg.sceneId, seg.text)}
                      className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 size={12} /> Gerar Áudio
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={3}
                className={INPUT_CLASS}
                value={seg.text}
                onChange={(e) =>
                  onUpdateProject({
                    ...project,
                    narrationSegments: project.narrationSegments.map((x) =>
                      x.sceneId === seg.sceneId ? { ...x, text: e.target.value } : x
                    ),
                  })
                }
              />

              <div className="text-xs text-gray-400 flex flex-wrap gap-4">
                <span>Pausas: {seg.pauses}</span>
                <span>·</span>
                <span>Pronúncia: {seg.pronunciation}</span>
                <span>·</span>
                <span>Ênfase: {seg.emphasis}</span>
                <span>·</span>
                <span>Ritmo: {seg.rhythm}</span>
              </div>

              {audioUrls[seg.sceneId] && (
                <audio controls src={audioUrls[seg.sceneId]} className="w-full mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ==================== GERADOR DE THUMBNAILS ==================== */
export const ThumbnailModule: React.FC<{
  project: Project;
  assets: StoredAsset[];
  settings: StudioSettings;
  onUpdateProject: (p: Project) => void;
  onAssetAdded: (a: StoredAsset) => void;
  setBusy: (b: boolean, label?: string) => void;
  notify: (msg: string, type?: 'info' | 'ok' | 'err') => void;
  onError?: (
    err: unknown,
    moduleLabel: string,
    fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
  ) => void;
}> = ({
  project,
  assets,
  settings,
  onUpdateProject,
  onAssetAdded,
  setBusy,
  notify,
  onError,
}) => {
  const generateConcepts = async () => {
    setBusy(true, 'Criando 3 variações de Thumbnail 16:9...');
    try {
      const vars = await aiService.generateThumbnails(project.briefing, settings);
      onUpdateProject({ ...project, thumbnailVariations: vars });
      notify('3 conceitos de Thumbnail gerados.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Gerador de Thumbnails');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar Thumbnails.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const generateArt = async (variationId: string, prompt: string) => {
    setBusy(true, 'Gerando imagem de Thumbnail 16:9 no Gemini...');
    try {
      const res = await apiClient.generateImage({
        prompt,
        aspectRatio: '16:9',
        model: settings.geminiImageModel,
      });
      const asset: StoredAsset = {
        id: crypto.randomUUID(),
        projectId: project.id,
        mimeType: res.mimeType,
        base64: res.base64,
        label: `Thumb ${variationId.slice(0, 6)}`,
        createdAt: new Date().toISOString(),
      };
      await dbService.saveAsset(asset);
      onAssetAdded(asset);
      onUpdateProject({
        ...project,
        thumbnailVariations: project.thumbnailVariations.map((v) =>
          v.id === variationId ? { ...v, generatedImageId: asset.id } : v
        ),
      });
      notify('Arte de Thumbnail gerada!', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'Geração Direta de Arte (Thumbnail)', {
          actionTarget: 'settings',
          actionLabel: 'Alterar Modelo em Configurações',
        });
      } else {
        notify(
          e instanceof Error ? e.message : 'Geração direta indisponível — copie o prompt.',
          'err'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerador de Thumbnails</h1>
          <p className="text-xs text-gray-400 mt-1">
            Padrão Chakra Puro BR: 16:9 · Fonte Barlow · Letras brancas e amarelas com contorno
            preto · Alto contraste para leitura mobile.
          </p>
        </div>
        <button
          onClick={generateConcepts}
          className="px-4 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
        >
          <Sparkles size={14} /> Gerar 3 Variações
        </button>
      </div>

      {project.thumbnailVariations.length === 0 ? (
        <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center text-sm text-gray-400">
          Gere 3 variações estratégicas de Thumbnail com composição, textos e prompts Gemini.
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {project.thumbnailVariations.map((v) => {
            const art = assets.find((a) => a.id === v.generatedImageId);
            return (
              <div
                key={v.id}
                className="bg-[#16161F] border border-[#242434] rounded-xl p-5 space-y-3 flex flex-col"
              >
                <h3 className="text-base font-bold text-white">{v.title}</h3>
                {/* 16:9 visual typography mockup preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden border border-[#242434] bg-gradient-to-br from-[#12121a] via-[#1b102c] to-[#09090d] flex flex-col items-center justify-center p-4 text-center">
                  {art && (
                    <img
                      src={`data:${art.mimeType};base64,${art.base64}`}
                      alt={v.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="relative z-10 font-display font-extrabold uppercase tracking-tight leading-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]">
                    <div
                      className="text-2xl text-white"
                      style={{ WebkitTextStroke: '1.5px #000' }}
                    >
                      {v.mainText}
                    </div>
                    <div
                      className="text-xl text-yellow-400 mt-1"
                      style={{ WebkitTextStroke: '1.2px #000' }}
                    >
                      {v.secondaryText}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">{v.visualConcept}</p>
                <div className="text-xs text-gray-400">
                  <strong>Composição:</strong> {v.composition}
                </div>

                <textarea
                  rows={4}
                  className={INPUT_CLASS}
                  value={v.geminiPrompt}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      thumbnailVariations: project.thumbnailVariations.map((x) =>
                        x.id === v.id ? { ...x, geminiPrompt: e.target.value } : x
                      ),
                    })
                  }
                />

                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    onClick={() => copyText(v.geminiPrompt, notify)}
                    className="flex-1 py-2 rounded-lg border border-[#242434] text-xs text-gray-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={12} /> Copiar Prompt
                  </button>
                  <button
                    onClick={() => generateArt(v.id, v.geminiPrompt)}
                    className="flex-1 py-2 rounded-lg bg-[#8B5CF6] text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon size={12} /> Gerar Arte
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ==================== SEO & VERIFICAÇÃO DE QUALIDADE ==================== */
export const SeoAndQualityModule: React.FC<{
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
    (v) => v.id === project.activeScriptId
  );

  const generateSeo = async () => {
    setBusy(true, 'Otimizando SEO e metadados com link obrigatório...');
    try {
      const seo = await aiService.generateSeo(project.briefing, activeScript, settings);
      onUpdateProject({ ...project, seo });
      notify('SEO e metadados gerados.', 'ok');
    } catch (e) {
      if (onError) {
        onError(e, 'SEO e Metadados');
      } else {
        notify(e instanceof Error ? e.message : 'Erro ao gerar SEO.', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const runQualityCheck = () => {
    const report = runLocalQualityAudit(project);
    onUpdateProject({ ...project, qualityReport: report });
    notify(`Auditoria concluída: ${report.overallStatus}`, report.overallStatus === 'Aprovado' ? 'ok' : 'info');
  };

  return (
    <div className="space-y-6">
      {/* SEO */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242434] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SEO e Metadados</h1>
            <p className="text-xs text-gray-400 mt-1">
              Inclui obrigatoriamente {MANDATORY_SUBSCRIBE_URL} na descrição.
            </p>
          </div>
          <button
            onClick={generateSeo}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={14} /> Gerar SEO Otimizado
          </button>
        </div>

        {!project.seo ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Clique em &ldquo;Gerar SEO Otimizado&rdquo; para criar 5 títulos, descrição, hashtags,
            tags, comentário fixado e aviso de spoilers.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                5 Opções de Título (clique para selecionar)
              </label>
              <div className="space-y-2">
                {project.seo.titleOptions.map((title, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateProject({
                          ...project,
                          seo: { ...project.seo!, selectedTitle: title },
                        })
                      }
                      className={`flex-1 text-left px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                        project.seo?.selectedTitle === title
                          ? 'border-[#A855F7] bg-[#8B5CF6]/15 text-white font-medium'
                          : 'border-[#242434] bg-[#0D0D14] text-gray-300'
                      }`}
                    >
                      {idx + 1}. {title}
                    </button>
                    <button
                      onClick={() => copyText(title, notify)}
                      className="p-2 rounded-lg border border-[#242434] text-gray-300 hover:text-white cursor-pointer"
                      title="Copiar título"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">Descrição Otimizada</label>
                <button
                  onClick={() => copyText(project.seo!.description, notify)}
                  className="text-xs text-[#C084FC] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} /> Copiar Descrição
                </button>
              </div>
              <textarea
                rows={6}
                className={INPUT_CLASS}
                value={project.seo.description}
                onChange={(e) =>
                  onUpdateProject({
                    ...project,
                    seo: { ...project.seo!, description: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-400">Hashtags</label>
                  <button
                    onClick={() => copyText(project.seo!.hashtags.join(' '), notify)}
                    className="text-xs text-[#C084FC] hover:underline cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
                <input
                  className={INPUT_CLASS}
                  value={project.seo.hashtags.join(' ')}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      seo: {
                        ...project.seo!,
                        hashtags: e.target.value.split(/\s+/).filter(Boolean),
                      },
                    })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-400">Tags (separadas por vírgula)</label>
                  <button
                    onClick={() => copyText(project.seo!.tags.join(', '), notify)}
                    className="text-xs text-[#C084FC] hover:underline cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
                <input
                  className={INPUT_CLASS}
                  value={project.seo.tags.join(', ')}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      seo: {
                        ...project.seo!,
                        tags: e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-400">Comentário Fixado</label>
                  <button
                    onClick={() => copyText(project.seo!.pinnedComment, notify)}
                    className="text-xs text-[#C084FC] hover:underline cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>
                <input
                  className={INPUT_CLASS}
                  value={project.seo.pinnedComment}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      seo: { ...project.seo!, pinnedComment: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Aviso de Spoilers
                </label>
                <input
                  className={INPUT_CLASS}
                  value={project.seo.spoilerNotice}
                  onChange={(e) =>
                    onUpdateProject({
                      ...project,
                      seo: { ...project.seo!, spoilerNotice: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verificação de Qualidade */}
      <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242434] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Verificação de Qualidade</h2>
            <p className="text-xs text-gray-400 mt-1">
              Auditoria técnica e editorial de consistência, 3ª pessoa, limite de 900 chars,
              metadados e riscos de direitos autorais.
            </p>
          </div>
          <button
            onClick={runQualityCheck}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck size={14} /> Executar Verificação
          </button>
        </div>

        {project.qualityReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>
                Resultado Geral:{' '}
                <strong
                  className={
                    project.qualityReport.overallStatus === 'Aprovado'
                      ? 'text-emerald-400'
                      : project.qualityReport.overallStatus === 'Reprovado'
                        ? 'text-red-400'
                        : 'text-amber-300'
                  }
                >
                  {project.qualityReport.overallStatus}
                </strong>
              </span>
              <span className="text-xs text-gray-400 font-mono-num">
                {new Date(project.qualityReport.checkedAt).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="divide-y divide-[#242434] border border-[#242434] rounded-lg bg-[#0D0D14]">
              {project.qualityReport.items.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      {item.label}{' '}
                      <span className="text-xs text-gray-500">· {item.category}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.details}</div>
                  </div>
                  <span
                    className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${
                      item.status === 'Aprovado'
                        ? 'text-emerald-400'
                        : item.status === 'Reprovado'
                          ? 'text-red-400'
                          : 'text-amber-300'
                    }`}
                  >
                    {item.status === 'Aprovado' ? (
                      <CheckCircle2 size={13} />
                    ) : item.status === 'Reprovado' ? (
                      <XCircle size={13} />
                    ) : (
                      <AlertTriangle size={13} />
                    )}
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-300/90 leading-relaxed">
              {project.qualityReport.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
