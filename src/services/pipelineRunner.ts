import { CharacterProfile, Project, StudioSettings } from '../types/studio';
import { evaluateBriefing, runLocalQualityAudit } from '../utils/validation';
import { aiService } from './aiPrompts';
import { exportProjectToDocx } from '../exporters/docxExporter';
import { exportBriefingToXlsx } from '../exporters/xlsxExporter';

export type ExecutionMode =
  | 'complete'
  | 'custom'
  | 'script_only'
  | 'images_only'
  | 'animations_only'
  | 'narration_only'
  | 'thumbnail_only'
  | 'seo_only'
  | 'docs_only';

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'error';

export interface PipelineStepState {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface PipelineController {
  paused: boolean;
  cancelled: boolean;
}

export const PIPELINE_STEPS_DEF = [
  { id: 'briefing', label: '01. Verificar briefing e pendências essenciais' },
  { id: 'trends', label: '02. Pesquisar tendências e fontes reais' },
  { id: 'script', label: '03. Recomendar formato e gerar roteiro' },
  { id: 'scenes', label: '04. Dividir roteiro em cenas (até 10s)' },
  { id: 'images', label: '05. Gerar 2 prompts de imagem por cena' },
  { id: 'animations', label: '06. Gerar e validar prompts YouTube Create (<= 900 chars)' },
  { id: 'narration', label: '07. Preparar narrações ElevenLabs' },
  { id: 'thumbnail', label: '08. Criar 3 variações de Thumbnail' },
  { id: 'seo', label: '09. Otimizar SEO e metadados' },
  { id: 'qa', label: '10. Executar verificação de qualidade' },
  { id: 'docs', label: '11. Exportar DOCX e XLSX' },
];

async function waitIfPaused(ctrl: PipelineController): Promise<void> {
  while (ctrl.paused && !ctrl.cancelled) {
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function runProductionPipeline(params: {
  project: Project;
  mode: ExecutionMode;
  selectedStepIds?: string[];
  characters: CharacterProfile[];
  settings: StudioSettings;
  controller: PipelineController;
  onProgress: (steps: PipelineStepState[], updatedProject: Project) => void;
  onStepError?: (stepId: string, stepLabel: string, error: unknown) => void;
}): Promise<Project> {
  const current = structuredClone(params.project);
  const { mode, selectedStepIds, characters, settings, controller, onProgress, onStepError } = params;

  const shouldRun = (id: string): boolean => {
    if (mode === 'complete') return true;
    if (mode === 'custom') return Boolean(selectedStepIds?.includes(id));
    const map: Record<ExecutionMode, string[]> = {
      complete: [],
      custom: [],
      script_only: ['briefing', 'script', 'scenes'],
      images_only: ['images'],
      animations_only: ['animations'],
      narration_only: ['narration'],
      thumbnail_only: ['thumbnail'],
      seo_only: ['seo'],
      docs_only: ['qa', 'docs'],
    };
    return map[mode].includes(id);
  };

  const steps: PipelineStepState[] = PIPELINE_STEPS_DEF.map((s) => ({
    ...s,
    status: shouldRun(s.id) ? 'pending' : 'skipped',
  }));

  const updateStep = (id: string, patch: Partial<PipelineStepState>) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx >= 0) steps[idx] = { ...steps[idx], ...patch };
    onProgress([...steps], current);
  };

  for (const step of steps) {
    if (step.status === 'skipped') continue;
    await waitIfPaused(controller);
    if (controller.cancelled) break;

    updateStep(step.id, { status: 'running' });

    try {
      if (step.id === 'briefing') {
        const evalRes = evaluateBriefing(current.briefing);
        if (evalRes.pendingRequired.length > 0 || evalRes.inconsistencies.length > 0) {
          throw new Error(
            [...evalRes.pendingRequired, ...evalRes.inconsistencies].join(' | ')
          );
        }
        updateStep('briefing', {
          status: 'completed',
          detail: `Briefing ${evalRes.completionPercent}% validado.`,
        });
      } else if (step.id === 'trends') {
        if (current.trendSearches.length === 0) {
          try {
            const tr = await aiService.researchTrends(
              current.briefing.identification.mainTheme,
              current.briefing.identification.anime,
              settings
            );
            current.trendSearches = [tr, ...current.trendSearches];
            updateStep('trends', {
              status: 'completed',
              detail: `${tr.items.length} tendências analisadas.`,
            });
          } catch (err) {
            updateStep('trends', {
              status: 'completed',
              detail: `Pesquisa web opcional ignorada: ${err instanceof Error ? err.message : 'erro'}`,
            });
          }
        } else {
          updateStep('trends', {
            status: 'completed',
            detail: 'Pesquisa existente preservada.',
          });
        }
      } else if (step.id === 'script') {
        if (current.scriptVersions.length === 0 || mode === 'script_only') {
          const script = await aiService.generateScript(current.briefing, settings);
          current.scriptVersions = [script, ...current.scriptVersions];
          current.activeScriptId = script.id;
          updateStep('script', {
            status: 'completed',
            detail: script.recommendedFormat,
          });
        } else {
          updateStep('script', {
            status: 'completed',
            detail: 'Roteiro existente preservado.',
          });
        }
      } else if (step.id === 'scenes') {
        const active = current.scriptVersions.find(
          (v) => v.id === current.activeScriptId
        );
        if (!active) throw new Error('Gere um roteiro antes de dividir em cenas.');
        if (current.scenes.length === 0 || mode === 'script_only') {
          current.scenes = await aiService.splitScriptIntoScenes(
            active,
            current.briefing,
            settings
          );
          updateStep('scenes', {
            status: 'completed',
            detail: `${current.scenes.length} cenas criadas (<=10s).`,
          });
        } else {
          updateStep('scenes', {
            status: 'completed',
            detail: `${current.scenes.length} cenas preservadas.`,
          });
        }
      } else if (step.id === 'images') {
        if (current.scenes.length === 0) {
          throw new Error('Divida o roteiro em cenas antes de gerar prompts de imagem.');
        }
        for (const scene of current.scenes) {
          await waitIfPaused(controller);
          if (controller.cancelled) break;
          if (!current.imagePromptsByScene[scene.id] || mode === 'images_only') {
            current.imagePromptsByScene[scene.id] =
              await aiService.generateImagePromptsForScene(
                scene,
                current.briefing,
                characters,
                settings
              );
          }
        }
        updateStep('images', {
          status: 'completed',
          detail: `${current.scenes.length * 2} prompts prontos.`,
        });
      } else if (step.id === 'animations') {
        if (current.scenes.length === 0) {
          throw new Error('Divida o roteiro em cenas antes de gerar animações.');
        }
        for (const scene of current.scenes) {
          await waitIfPaused(controller);
          if (controller.cancelled) break;
          const existing = current.animationPromptsByScene[scene.id];
          if (!existing || !existing.approved || mode === 'animations_only') {
            current.animationPromptsByScene[scene.id] =
              await aiService.generateAnimationPromptForScene(
                scene,
                current.briefing,
                settings
              );
          }
        }
        updateStep('animations', {
          status: 'completed',
          detail: 'Prompts <= 900 caracteres validados.',
        });
      } else if (step.id === 'narration') {
        if (current.scenes.length === 0) {
          throw new Error('Divida o roteiro em cenas antes de preparar a narração.');
        }
        if (current.narrationSegments.length === 0 || mode === 'narration_only') {
          current.narrationSegments = await aiService.generateNarrationPlan(
            current.scenes,
            current.briefing,
            settings
          );
        }
        updateStep('narration', {
          status: 'completed',
          detail: `${current.narrationSegments.length} trechos prontos.`,
        });
      } else if (step.id === 'thumbnail') {
        if (current.thumbnailVariations.length === 0 || mode === 'thumbnail_only') {
          current.thumbnailVariations = await aiService.generateThumbnails(
            current.briefing,
            settings
          );
        }
        updateStep('thumbnail', {
          status: 'completed',
          detail: `${current.thumbnailVariations.length} variações criadas.`,
        });
      } else if (step.id === 'seo') {
        if (!current.seo || mode === 'seo_only') {
          const active = current.scriptVersions.find(
            (v) => v.id === current.activeScriptId
          );
          current.seo = await aiService.generateSeo(current.briefing, active, settings);
        }
        updateStep('seo', {
          status: 'completed',
          detail: '5 títulos e descrição otimizados.',
        });
      } else if (step.id === 'qa') {
        current.qualityReport = runLocalQualityAudit(current);
        updateStep('qa', {
          status: 'completed',
          detail: `Status QA: ${current.qualityReport.overallStatus}`,
        });
      } else if (step.id === 'docs') {
        await exportProjectToDocx(current);
        await exportBriefingToXlsx(current.briefing);
        current.exportedDocsCount = (current.exportedDocsCount || 0) + 2;
        updateStep('docs', {
          status: 'completed',
          detail: 'DOCX e XLSX exportados.',
        });
      }

      current.history.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: `Automação concluiu: ${step.label}`,
      });
    } catch (err) {
      updateStep(step.id, {
        status: 'error',
        detail: err instanceof Error ? err.message : 'Falha na etapa.',
      });
      onStepError?.(step.id, step.label, err);
      break;
    }
  }

  return current;
}
