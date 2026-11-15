import React, { useState } from 'react';
import { Save, CopyPlus, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  Briefing,
  EMOTIONAL_STYLES,
  NARRATIVE_FORMATS,
  NarrativeFormatCode,
} from '../types/studio';
import { evaluateBriefing } from '../utils/validation';

interface BriefingFormProps {
  briefing: Briefing;
  onChange: (updated: Briefing) => void;
  onSaveProject: () => void;
  onDuplicateAsNewProject: () => void;
  onProceedToScript: () => void;
}

const TABS = [
  '01. Início',
  '02. Identificação',
  '03. Duração',
  '04. Formatos',
  '05. Narração',
  '06. Visual',
  '07. Animação/SFX',
  '08. Thumbnail',
  '09. SEO',
  '10. Direitos',
  '11. Preferências',
  '12. Resumo',
];

const INPUT_CLASS =
  'w-full bg-[#0D0D14] border border-[#242434] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none';
const LABEL_CLASS = 'block text-xs font-medium text-gray-400 mb-1.5';

export const BriefingForm: React.FC<BriefingFormProps> = ({
  briefing,
  onChange,
  onSaveProject,
  onDuplicateAsNewProject,
  onProceedToScript,
}) => {
  const [tab, setTab] = useState(0);
  const summary = evaluateBriefing(briefing);

  const patch = <K extends keyof Briefing>(
    section: K,
    values: Partial<Briefing[K]>
  ) => {
    onChange({
      ...briefing,
      [section]: { ...briefing[section], ...values },
    });
  };

  return (
    <div className="bg-[#16161F] border border-[#242434] rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242434] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Briefing Inteligente</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono-num">
            Status: <span className="text-gray-200 font-medium">{summary.status}</span> ·{' '}
            {summary.completionPercent}% preenchido · {summary.pendingRequired.length} pendência(s) obrigatória(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onDuplicateAsNewProject}
            className="px-3.5 py-2 rounded-lg border border-[#242434] bg-[#111118] text-xs font-medium text-gray-200 hover:border-[#A855F7]/50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <CopyPlus size={14} /> Duplicar Briefing
          </button>
          <button
            onClick={onSaveProject}
            className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Save size={14} /> Salvar Briefing
          </button>
        </div>
      </div>

      <div className="w-full h-1.5 bg-[#0D0D14] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#8B5CF6] transition-all duration-300"
          style={{ width: `${summary.completionPercent}%` }}
        />
      </div>

      {/* 12 Tabs */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#242434]">
        {TABS.map((t, i) => {
          const hasMissingRequired =
            (i === 1 &&
              (!briefing.identification.projectName.trim() ||
                !briefing.identification.anime.trim() ||
                !briefing.identification.mainTheme.trim() ||
                !briefing.identification.mainCharacter.trim() ||
                !briefing.identification.videoObjective.trim())) ||
            (i === 2 &&
              (briefing.duration.desiredDurationSeconds <= 0 ||
                briefing.duration.maxSceneSeconds > 10)) ||
            (i === 5 && !briefing.visualIdentity.animeStyle.trim()) ||
            (i === 8 && !briefing.seo.primaryKeyword.trim()) ||
            (i === 11 && summary.pendingRequired.length > 0);

          return (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tab === i
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#111118] text-gray-400 hover:text-white border border-[#242434]'
              }`}
            >
              <span>{t}</span>
              {hasMissingRequired && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tab === i ? 'bg-amber-200' : 'bg-red-400'
                  }`}
                  title="Pendência obrigatória nesta aba"
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">
              01. Instruções do Briefing
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Este briefing centraliza todas as diretrizes para o Roteirista IA, a divisão em cenas
              de até 10 segundos, os dois prompts de imagem Gemini por cena, os prompts do YouTube
              Create (máximo 900 caracteres, sem música ou trilha sonora), a narração ElevenLabs,
              a Thumbnail e o SEO.
            </p>
            <p className="text-xs text-gray-400">
              Campos marcados com * são obrigatórios para liberar a produção automatizada completa.
              Todas as alterações são salvas automaticamente no navegador (IndexedDB).
            </p>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-[#242434] pt-4 lg:pt-0 lg:pl-6 space-y-3">
            <h3 className="text-base font-semibold text-white">
              Diagnóstico de Pendências
            </h3>
            {summary.pendingRequired.length === 0 && summary.inconsistencies.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={16} /> Todos os campos essenciais estão validados.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.pendingRequired.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle size={13} /> Obrigatório pendente: {p}
                  </div>
                ))}
                {summary.inconsistencies.map((inc) => (
                  <div key={inc} className="flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle size={13} /> Inconsistência: {inc}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Nome do projeto *</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.projectName}
              onChange={(e) => patch('identification', { projectName: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Anime *</label>
            <input
              className={INPUT_CLASS}
              placeholder="Ex: Naruto Shippuden, Jujutsu Kaisen, One Piece"
              value={briefing.identification.anime}
              onChange={(e) => patch('identification', { anime: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Tema principal *</label>
            <input
              className={INPUT_CLASS}
              placeholder="Ex: O segredo por trás do Modo Bárion"
              value={briefing.identification.mainTheme}
              onChange={(e) => patch('identification', { mainTheme: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Personagem principal *</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.mainCharacter}
              onChange={(e) => patch('identification', { mainCharacter: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Personagens secundários</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.secondaryCharacters}
              onChange={(e) =>
                patch('identification', { secondaryCharacters: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Episódio ou saga</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.episodeOrSaga}
              onChange={(e) => patch('identification', { episodeOrSaga: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Referência ou acontecimento</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.referenceOrEvent}
              onChange={(e) =>
                patch('identification', { referenceOrEvent: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Objetivo do vídeo *</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.videoObjective}
              onChange={(e) => patch('identification', { videoObjective: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Público-alvo</label>
            <input
              className={INPUT_CLASS}
              value={briefing.identification.targetAudience}
              onChange={(e) => patch('identification', { targetAudience: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Data prevista</label>
            <input
              type="date"
              className={INPUT_CLASS}
              value={briefing.identification.plannedDate}
              onChange={(e) => patch('identification', { plannedDate: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Observações</label>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={briefing.identification.notes}
              onChange={(e) => patch('identification', { notes: e.target.value })}
            />
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Tipo de vídeo</label>
            <select
              className={INPUT_CLASS}
              value={briefing.duration.videoType}
              onChange={(e) => {
                const vt = e.target.value as 'Short' | 'Vídeo Longo';
                const ar = vt === 'Short' ? '9:16' : '16:9';
                onChange({
                  ...briefing,
                  duration: { ...briefing.duration, videoType: vt, aspectRatio: ar },
                  visualIdentity: { ...briefing.visualIdentity, aspectRatio: ar },
                });
              }}
            >
              <option value="Short">Short</option>
              <option value="Vídeo Longo">Vídeo Longo</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Duração desejada (segundos) *</label>
            <input
              type="number"
              min={10}
              className={INPUT_CLASS}
              value={briefing.duration.desiredDurationSeconds}
              onChange={(e) =>
                patch('duration', { desiredDurationSeconds: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Tempo máximo por cena (máx. 10s) *</label>
            <input
              type="number"
              min={2}
              max={10}
              className={INPUT_CLASS}
              value={briefing.duration.maxSceneSeconds}
              onChange={(e) =>
                patch('duration', {
                  maxSceneSeconds: Math.min(10, Math.max(2, Number(e.target.value))),
                })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Quantidade estimada de cenas</label>
            <input
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={briefing.duration.sceneCount}
              onChange={(e) => patch('duration', { sceneCount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Proporção</label>
            <select
              className={INPUT_CLASS}
              value={briefing.duration.aspectRatio}
              onChange={(e) => {
                const ar = e.target.value as '9:16' | '16:9';
                onChange({
                  ...briefing,
                  duration: { ...briefing.duration, aspectRatio: ar },
                  visualIdentity: { ...briefing.visualIdentity, aspectRatio: ar },
                });
              }}
            >
              <option value="9:16">9:16 (Vertical)</option>
              <option value="16:9">16:9 (Horizontal)</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Ritmo narrativo</label>
            <select
              className={INPUT_CLASS}
              value={briefing.duration.narrativePace}
              onChange={(e) =>
                patch('duration', {
                  narrativePace: e.target.value as Briefing['duration']['narrativePace'],
                })
              }
            >
              <option>Lento</option>
              <option>Equilibrado</option>
              <option>Dinâmico</option>
              <option>Frenético</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Velocidade da narração</label>
            <select
              className={INPUT_CLASS}
              value={briefing.duration.narrationSpeed}
              onChange={(e) =>
                patch('duration', {
                  narrationSpeed: e.target.value as Briefing['duration']['narrationSpeed'],
                })
              }
            >
              <option>Lenta</option>
              <option>Normal</option>
              <option>Rápida</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Divisão automática (cenas até 10s)</label>
            <select
              className={INPUT_CLASS}
              value={briefing.duration.autoSplit ? 'sim' : 'nao'}
              onChange={(e) => patch('duration', { autoSplit: e.target.value === 'sim' })}
            >
              <option value="sim">Ativada</option>
              <option value="nao">Manual</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Observações</label>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={briefing.duration.notes}
              onChange={(e) => patch('duration', { notes: e.target.value })}
            />
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>
              Formato principal (se vazio, a IA recomendará o ideal)
            </label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.primaryFormat}
              onChange={(e) =>
                patch('narrativeFormat', {
                  primaryFormat: e.target.value as NarrativeFormatCode,
                })
              }
            >
              <option value="">Automático — IA recomenda o melhor formato</option>
              {Object.entries(NARRATIVE_FORMATS).map(([code, name]) => (
                <option key={code} value={code}>
                  {code}. {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Formato secundário</label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.secondaryFormat}
              onChange={(e) =>
                patch('narrativeFormat', {
                  secondaryFormat: e.target.value as NarrativeFormatCode,
                })
              }
            >
              <option value="">Nenhum</option>
              {Object.entries(NARRATIVE_FORMATS).map(([code, name]) => (
                <option key={code} value={code}>
                  {code}. {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Combinação de formatos</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.formatCombination}
              onChange={(e) =>
                patch('narrativeFormat', { formatCombination: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Intensidade narrativa</label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.narrativeIntensity}
              onChange={(e) =>
                patch('narrativeFormat', {
                  narrativeIntensity:
                    e.target.value as Briefing['narrativeFormat']['narrativeIntensity'],
                })
              }
            >
              <option>Moderada</option>
              <option>Alta</option>
              <option>Extrema</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Tipo de gancho</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.hookType}
              onChange={(e) => patch('narrativeFormat', { hookType: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Desenvolvimento</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.development}
              onChange={(e) =>
                patch('narrativeFormat', { development: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Revelação</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.revelation}
              onChange={(e) => patch('narrativeFormat', { revelation: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Encerramento</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.ending}
              onChange={(e) => patch('narrativeFormat', { ending: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>CTA</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrativeFormat.cta}
              onChange={(e) => patch('narrativeFormat', { cta: e.target.value })}
            />
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Tom de voz</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrationStyle.voiceTone}
              onChange={(e) => patch('narrationStyle', { voiceTone: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Estilo emocional *</label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrationStyle.emotionalStyle}
              onChange={(e) =>
                patch('narrationStyle', {
                  emotionalStyle:
                    e.target.value as Briefing['narrationStyle']['emotionalStyle'],
                })
              }
            >
              {EMOTIONAL_STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Intensidade</label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrationStyle.intensity}
              onChange={(e) =>
                patch('narrationStyle', {
                  intensity: e.target.value as Briefing['narrationStyle']['intensity'],
                })
              }
            >
              <option>Suave</option>
              <option>Média</option>
              <option>Forte</option>
              <option>Épica</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Velocidade</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrationStyle.speed}
              onChange={(e) => patch('narrationStyle', { speed: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Voz (Masculina ou Feminina)</label>
            <select
              className={INPUT_CLASS}
              value={briefing.narrationStyle.voiceGender}
              onChange={(e) =>
                patch('narrationStyle', {
                  voiceGender: e.target.value as 'Masculina' | 'Feminina',
                })
              }
            >
              <option>Masculina</option>
              <option>Feminina</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Referência de voz ElevenLabs (Voice ID)</label>
            <input
              className={INPUT_CLASS}
              placeholder="Ex: pNInz6obpgDQGcFmaJgB"
              value={briefing.narrationStyle.elevenLabsVoiceRef}
              onChange={(e) =>
                patch('narrationStyle', { elevenLabsVoiceRef: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Pronúncia</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrationStyle.pronunciationNotes}
              onChange={(e) =>
                patch('narrationStyle', { pronunciationNotes: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Pausas</label>
            <input
              className={INPUT_CLASS}
              value={briefing.narrationStyle.pauseNotes}
              onChange={(e) => patch('narrationStyle', { pauseNotes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Preferências de interpretação</label>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={briefing.narrationStyle.interpretationPrefs}
              onChange={(e) =>
                patch('narrationStyle', { interpretationPrefs: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {tab === 5 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              ['animeStyle', 'Estilo anime *'],
              ['aestheticRef', 'Referência estética'],
              ['colorPalette', 'Paleta de cores'],
              ['lighting', 'Iluminação'],
              ['environments', 'Cenários'],
              ['characters', 'Personagens'],
              ['physicalAppearance', 'Aparência física'],
              ['clothing', 'Vestimentas'],
              ['expressions', 'Expressões'],
              ['cameraAngles', 'Ângulos de câmera'],
              ['detailLevel', 'Detalhamento'],
              ['visualContinuity', 'Continuidade visual'],
              ['usageRestrictions', 'Restrições de uso'],
              ['referenceLinks', 'Links de referência'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className={LABEL_CLASS}>{label}</label>
              <input
                className={INPUT_CLASS}
                value={briefing.visualIdentity[key]}
                onChange={(e) => patch('visualIdentity', { [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 6 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-200 flex flex-wrap gap-4">
            <span>Trilha sonora: DESATIVADA (permanente)</span>
            <span>·</span>
            <span>Música: DESATIVADA (permanente)</span>
            <span>·</span>
            <span className="font-mono-num">Limite YouTube Create: 900 caracteres</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ['characterMovement', 'Movimento dos personagens'],
                ['cameraMovement', 'Movimento de câmera'],
                ['environmentMovement', 'Movimento do ambiente'],
                ['visualEffects', 'Efeitos visuais'],
                ['soundEffects', 'Efeitos sonoros'],
                ['impacts', 'Impactos'],
                ['naturalSounds', 'Sons naturais'],
                ['transitions', 'Transições'],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label className={LABEL_CLASS}>{label}</label>
                <input
                  className={INPUT_CLASS}
                  value={briefing.animationSfx[k]}
                  onChange={(e) => patch('animationSfx', { [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 7 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Identidade padrão aplicada: Proporção 16:9 · Fonte Barlow · Letras brancas e amarelas ·
            Contorno preto · Contraste elevado · Texto centralizado · Personagem em destaque.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ['mainCharacter', 'Personagem principal'],
                ['mainText', 'Texto principal'],
                ['secondaryText', 'Texto secundário'],
                ['expression', 'Expressão'],
                ['background', 'Cenário'],
                ['style', 'Estilo'],
                ['colors', 'Cores'],
                ['composition', 'Composição'],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label className={LABEL_CLASS}>{label}</label>
                <input
                  className={INPUT_CLASS}
                  value={briefing.thumbnail[k]}
                  onChange={(e) => patch('thumbnail', { [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 8 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Palavra-chave principal *</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.primaryKeyword}
              onChange={(e) => patch('seo', { primaryKeyword: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Palavras-chave secundárias</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.secondaryKeywords}
              onChange={(e) => patch('seo', { secondaryKeywords: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Título desejado</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.desiredTitle}
              onChange={(e) => patch('seo', { desiredTitle: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Estilo do título</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.titleStyle}
              onChange={(e) => patch('seo', { titleStyle: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Spoilers</label>
            <select
              className={INPUT_CLASS}
              value={briefing.seo.spoilers}
              onChange={(e) =>
                patch('seo', {
                  spoilers: e.target.value as Briefing['seo']['spoilers'],
                })
              }
            >
              <option>Sem spoilers</option>
              <option>Spoilers leves</option>
              <option>Spoilers pesados</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Data e horário previsto</label>
            <input
              type="datetime-local"
              className={INPUT_CLASS}
              value={briefing.seo.publishDateTime}
              onChange={(e) => patch('seo', { publishDateTime: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Descrição base</label>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={briefing.seo.description}
              onChange={(e) => patch('seo', { description: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Hashtags</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.hashtags}
              onChange={(e) => patch('seo', { hashtags: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Tags</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.tags}
              onChange={(e) => patch('seo', { tags: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Comentário fixado</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.pinnedComment}
              onChange={(e) => patch('seo', { pinnedComment: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>CTA</label>
            <input
              className={INPUT_CLASS}
              value={briefing.seo.cta}
              onChange={(e) => patch('seo', { cta: e.target.value })}
            />
          </div>
        </div>
      )}

      {tab === 9 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Conteúdo destinado a crianças</label>
            <select
              className={INPUT_CLASS}
              value={briefing.copyright.madeForKids}
              onChange={(e) =>
                patch('copyright', {
                  madeForKids: e.target.value as Briefing['copyright']['madeForKids'],
                })
              }
            >
              <option>Não</option>
              <option>Sim</option>
              <option>Não informado</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Existência de spoilers</label>
            <select
              className={INPUT_CLASS}
              value={briefing.copyright.hasSpoilers}
              onChange={(e) =>
                patch('copyright', {
                  hasSpoilers: e.target.value as Briefing['copyright']['hasSpoilers'],
                })
              }
            >
              <option>Não informado</option>
              <option>Sim</option>
              <option>Não</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Declaração de conteúdo sintético</label>
            <select
              className={INPUT_CLASS}
              value={briefing.copyright.syntheticContentDeclaration}
              onChange={(e) =>
                patch('copyright', {
                  syntheticContentDeclaration:
                    e.target.value as Briefing['copyright']['syntheticContentDeclaration'],
                })
              }
            >
              <option>Sim (IA)</option>
              <option>Avaliar antes de publicar</option>
              <option>Não</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Personagens protegidos</label>
            <input
              className={INPUT_CLASS}
              value={briefing.copyright.protectedCharacters}
              onChange={(e) =>
                patch('copyright', { protectedCharacters: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Materiais de terceiros</label>
            <input
              className={INPUT_CLASS}
              value={briefing.copyright.thirdPartyMaterials}
              onChange={(e) =>
                patch('copyright', { thirdPartyMaterials: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Imagens externas</label>
            <input
              className={INPUT_CLASS}
              value={briefing.copyright.externalImages}
              onChange={(e) =>
                patch('copyright', { externalImages: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Áudios externos</label>
            <input
              className={INPUT_CLASS}
              value={briefing.copyright.externalAudios}
              onChange={(e) =>
                patch('copyright', { externalAudios: e.target.value })
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Autorizações</label>
            <input
              className={INPUT_CLASS}
              value={briefing.copyright.authorizations}
              onChange={(e) =>
                patch('copyright', { authorizations: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Restrições adicionais</label>
            <textarea
              rows={2}
              className={INPUT_CLASS}
              value={briefing.copyright.additionalRestrictions}
              onChange={(e) =>
                patch('copyright', { additionalRestrictions: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {tab === 10 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              ['ideas', 'Ideias'],
              ['references', 'Referências'],
              ['mandatoryElements', 'Elementos obrigatórios'],
              ['forbiddenElements', 'Elementos proibidos'],
              ['characters', 'Personagens'],
              ['preferences', 'Preferências'],
              ['specialInstructions', 'Instruções especiais'],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className={LABEL_CLASS}>{label}</label>
              <textarea
                rows={3}
                className={INPUT_CLASS}
                value={briefing.preferences[k]}
                onChange={(e) => patch('preferences', { [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {tab === 11 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Resumo Consolidado</h3>
            <div className="text-sm text-gray-300 space-y-1.5">
              <div>
                <span className="text-gray-400">Status:</span>{' '}
                <strong className="text-white">{summary.status}</strong> (
                <span className="font-mono-num">{summary.completionPercent}%</span>)
              </div>
              <div>
                <span className="text-gray-400">Anime / Tema:</span>{' '}
                {briefing.identification.anime || '—'} ·{' '}
                {briefing.identification.mainTheme || '—'}
              </div>
              <div>
                <span className="text-gray-400">Duração / Proporção:</span>{' '}
                {briefing.duration.videoType} · {briefing.duration.desiredDurationSeconds}s ·{' '}
                {briefing.duration.aspectRatio}
              </div>
              <div>
                <span className="text-gray-400">Narração:</span>{' '}
                {briefing.narrationStyle.emotionalStyle} · {briefing.narrationStyle.voiceGender}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onProceedToScript}
                className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
              >
                Avançar para Roteirista IA <ArrowRight size={14} />
              </button>
              <button
                onClick={onSaveProject}
                className="px-4 py-2 rounded-lg border border-[#242434] text-xs font-medium text-gray-200 hover:text-white cursor-pointer"
              >
                Salvar Briefing
              </button>
            </div>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-[#242434] pt-4 lg:pt-0 lg:pl-6 space-y-3">
            <h4 className="text-sm font-semibold text-white">
              Campos Pendentes ({summary.pendingRequired.length} obrigatórios ·{' '}
              {summary.pendingOptional.length} opcionais)
            </h4>
            {summary.pendingRequired.map((p) => (
              <div key={p} className="text-xs text-red-400">
                • Obrigatório: {p}
              </div>
            ))}
            {summary.inconsistencies.map((inc) => (
              <div key={inc} className="text-xs text-amber-300">
                • Inconsistência: {inc}
              </div>
            ))}
            {summary.pendingOptional.map((p) => (
              <div key={p} className="text-xs text-gray-400">
                • Opcional: {p}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
