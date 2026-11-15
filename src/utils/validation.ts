import {
  Briefing,
  BriefingStatus,
  Project,
  QualityCheckItem,
  QualityLevel,
  QualityReport,
} from '../types/studio';

export const YOUTUBE_CREATE_LIMIT = 900;
export const MANDATORY_SUBSCRIBE_URL =
  'https://www.youtube.com/@chakrapurobr?sub_confirmation=1';

export function createDefaultBriefing(
  name = 'Novo Projeto Chakra Puro BR',
  aspectRatio: '9:16' | '16:9' = '9:16'
): Briefing {
  return {
    identification: {
      projectName: name,
      anime: '',
      mainTheme: '',
      mainCharacter: '',
      secondaryCharacters: '',
      episodeOrSaga: '',
      referenceOrEvent: '',
      videoObjective: 'Gerar alta retenção e debate construtivo nos comentários',
      targetAudience: 'Fãs de anime no Brasil (14 a 34 anos)',
      plannedDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
    duration: {
      videoType: aspectRatio === '9:16' ? 'Short' : 'Vídeo Longo',
      desiredDurationSeconds: aspectRatio === '9:16' ? 55 : 420,
      maxSceneSeconds: 8,
      sceneCount: aspectRatio === '9:16' ? 7 : 50,
      aspectRatio,
      narrativePace: 'Dinâmico',
      narrationSpeed: 'Normal',
      autoSplit: true,
      notes: '',
    },
    narrativeFormat: {
      primaryFormat: '',
      secondaryFormat: '',
      formatCombination: '',
      hookType: 'Pergunta direta ou revelação impactante nos 3 primeiros segundos',
      development: 'Curiosidade progressiva com evidências do cânone',
      revelation: 'Virada narrativa no terço final',
      ending: 'Fechamento com recompensa narrativa',
      cta: 'Inscreva-se no Chakra Puro BR e comente sua teoria',
      narrativeIntensity: 'Alta',
    },
    narrationStyle: {
      voiceTone: 'Grave, envolvente e cinematográfico',
      emotionalStyle: 'Misterioso',
      intensity: 'Forte',
      speed: '1.05x (ritmo constante e claro)',
      voiceGender: 'Masculina',
      elevenLabsVoiceRef: '',
      pronunciationNotes: 'Preservar nomes oficiais de técnicas/personagens com pronúncia natural ao PT-BR.',
      pauseNotes: 'Pausa de 0.4s antes de revelações-chave.',
      interpretationPrefs: 'Terceira pessoa narrativa constante.',
    },
    visualIdentity: {
      animeStyle: '2D Anime Cinematográfico Moderno (estilo estúdio Ufotable/MAPPA)',
      aestheticRef: 'Alto contraste, partículas energéticas e profundidade de campo',
      colorPalette: 'Pretos profundos, roxo chakra, dourado e azul elétrico',
      lighting: 'Rim light dramático e sombras marcadas',
      environments: 'Campos de batalha noturnos, templos antigos e planos espirituais',
      characters: '',
      physicalAppearance: '',
      clothing: '',
      expressions: 'Determinação intensa, choque, foco frio',
      cameraAngles: 'Low angle épico, close-up nos olhos, plano holandês',
      detailLevel: 'Ultra detalhado, lineart limpa, composição cinematográfica',
      visualContinuity: 'Preservar traços faciais, cicatrizes e vestimenta em todas as cenas',
      aspectRatio,
      usageRestrictions: 'Sem marcas d’água, sem texto aleatório na cena',
      referenceLinks: '',
    },
    animationSfx: {
      characterMovement: 'Movimentos fluidos de cabelo, capa, respiração e olhar',
      cameraMovement: 'Push-in lento e parallax sutil',
      intensity: 'Moderada',
      environmentMovement: 'Partículas de energia, poeira e vento',
      visualEffects: 'Brilho ocular, aura sutil, distorção atmosférica',
      soundEffects: 'Whoosh seco, estalo de energia, vento ambiente',
      impacts: 'Impacto grave pontual sem saturação',
      naturalSounds: 'Passos, tecido ao vento, crepitar de energia',
      transitions: 'Corte seco rítmico e whip pan suave',
      soundtrackDisabled: true,
      musicDisabled: true,
      youtubeCreateMaxChars: 900,
    },
    thumbnail: {
      mainCharacter: '',
      mainText: '',
      secondaryText: '',
      expression: 'Impactante / Choque ou Determinação extrema',
      background: 'Fundo dramático escuro com aura energética',
      style: 'Miniatura de alto contraste estilo Chakra Puro BR',
      colors: 'Branco e Amarelo com contorno preto espesso',
      composition: 'Personagem em destaque lateral e texto centralizado legível no celular',
      aspectRatio: '16:9',
    },
    seo: {
      primaryKeyword: '',
      secondaryKeywords: '',
      desiredTitle: '',
      titleStyle: 'Curiosidade + Autoridade (sem clickbait enganoso)',
      description: '',
      hashtags: '#anime #chakrapurobr #curiosidadesanime',
      tags: '',
      pinnedComment: 'Qual detalhe dessa história mais chamou sua atenção? Comenta aí!',
      cta: 'Inscreva-se no Chakra Puro BR!',
      spoilers: 'Spoilers leves',
      publishDateTime: '',
    },
    copyright: {
      madeForKids: 'Não',
      hasSpoilers: 'Não informado',
      protectedCharacters: 'Obras e personagens pertencem aos respectivos estúdios e autores.',
      thirdPartyMaterials: 'Não informado',
      externalImages: 'Arte conceitual gerada via IA (Gemini) como apoio transformativo.',
      externalAudios: 'Narração sintética sem música ou trilha sonora de terceiros.',
      authorizations: 'Uso editorial/informativo — revisar diretrizes de monetização.',
      syntheticContentDeclaration: 'Sim (IA)',
      additionalRestrictions: '',
    },
    preferences: {
      ideas: '',
      references: '',
      mandatoryElements: 'Narração em 3ª pessoa, português do Brasil, diferenciar cânone de teoria.',
      forbiddenElements: 'Música de fundo nos prompts de animação; informações inventadas.',
      characters: '',
      preferences: '',
      specialInstructions: '',
    },
  };
}

export function createNewProject(
  name = 'Novo Projeto Chakra Puro BR',
  aspectRatio: '9:16' | '16:9' = '9:16'
): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'rascunho',
    currentStep: 'Briefing',
    completionPercent: 0,
    exportedDocsCount: 0,
    briefing: createDefaultBriefing(name, aspectRatio),
    trendSearches: [],
    scriptVersions: [],
    scenes: [],
    imagePromptsByScene: {},
    animationPromptsByScene: {},
    narrationSegments: [],
    thumbnailVariations: [],
    history: [
      {
        id: crypto.randomUUID(),
        timestamp: now,
        action: 'Projeto criado no Chakra Puro BR Studio',
      },
    ],
  };
}

export interface BriefingValidationSummary {
  completionPercent: number;
  status: BriefingStatus;
  pendingRequired: string[];
  pendingOptional: string[];
  inconsistencies: string[];
}

export function evaluateBriefing(briefing: Briefing): BriefingValidationSummary {
  const requiredChecks: Array<{ label: string; ok: boolean }> = [
    { label: 'Nome do projeto (Aba 02)', ok: Boolean(briefing.identification.projectName.trim()) },
    { label: 'Anime (Aba 02)', ok: Boolean(briefing.identification.anime.trim()) },
    { label: 'Tema principal (Aba 02)', ok: Boolean(briefing.identification.mainTheme.trim()) },
    { label: 'Personagem principal (Aba 02)', ok: Boolean(briefing.identification.mainCharacter.trim()) },
    { label: 'Objetivo do vídeo (Aba 02)', ok: Boolean(briefing.identification.videoObjective.trim()) },
    { label: 'Duração desejada > 0 (Aba 03)', ok: briefing.duration.desiredDurationSeconds > 0 },
    {
      label: 'Tempo máximo por cena <= 10s (Aba 03)',
      ok: briefing.duration.maxSceneSeconds > 0 && briefing.duration.maxSceneSeconds <= 10,
    },
    { label: 'Estilo emocional da narração (Aba 05)', ok: Boolean(briefing.narrationStyle.emotionalStyle) },
    { label: 'Estilo visual anime (Aba 06)', ok: Boolean(briefing.visualIdentity.animeStyle.trim()) },
    { label: 'Palavra-chave principal SEO (Aba 09)', ok: Boolean(briefing.seo.primaryKeyword.trim()) },
  ];

  const optionalChecks: Array<{ label: string; ok: boolean }> = [
    { label: 'Episódio ou saga (Aba 02)', ok: Boolean(briefing.identification.episodeOrSaga.trim()) },
    { label: 'Formato narrativo escolhido (Aba 04)', ok: Boolean(briefing.narrativeFormat.primaryFormat) },
    { label: 'Referência de voz ElevenLabs (Aba 05)', ok: Boolean(briefing.narrationStyle.elevenLabsVoiceRef.trim()) },
    { label: 'Aparência física detalhada (Aba 06)', ok: Boolean(briefing.visualIdentity.physicalAppearance.trim()) },
    { label: 'Texto principal da Thumbnail (Aba 08)', ok: Boolean(briefing.thumbnail.mainText.trim()) },
    { label: 'Status de spoilers definido (Aba 10)', ok: briefing.copyright.hasSpoilers !== 'Não informado' },
  ];

  const pendingRequired = requiredChecks.filter((c) => !c.ok).map((c) => c.label);
  const pendingOptional = optionalChecks.filter((c) => !c.ok).map((c) => c.label);

  const inconsistencies: string[] = [];
  if (briefing.duration.videoType === 'Short' && briefing.duration.desiredDurationSeconds > 180) {
    inconsistencies.push('Vídeo marcado como Short, mas duração desejada excede 180s.');
  }
  if (briefing.duration.videoType === 'Short' && briefing.duration.aspectRatio !== '9:16') {
    inconsistencies.push('Short geralmente exige proporção vertical 9:16.');
  }
  if (briefing.duration.maxSceneSeconds > 10) {
    inconsistencies.push('Regra crítica: tempo máximo por cena não pode ultrapassar 10 segundos.');
  }
  if (briefing.duration.aspectRatio !== briefing.visualIdentity.aspectRatio) {
    inconsistencies.push('Proporção da Aba 03 difere da proporção da Aba 06 (Identidade Visual).');
  }
  if (!briefing.animationSfx.musicDisabled || !briefing.animationSfx.soundtrackDisabled) {
    inconsistencies.push('Trilha sonora e música devem permanecer permanentemente DESATIVADAS.');
  }

  const total = requiredChecks.length + optionalChecks.length;
  const filled =
    requiredChecks.filter((c) => c.ok).length + optionalChecks.filter((c) => c.ok).length;
  const completionPercent = Math.round((filled / total) * 100);

  let status: BriefingStatus = 'Em preenchimento';
  if (filled <= 3) status = 'Não iniciado';
  else if (pendingRequired.length > 0 || inconsistencies.length > 0) status = 'Incompleto';
  else status = 'Pronto para produção';

  return {
    completionPercent,
    status,
    pendingRequired,
    pendingOptional,
    inconsistencies,
  };
}

export function validateAnimationPromptLength(prompt: string): {
  charCount: number;
  valid: boolean;
  excess: number;
} {
  const charCount = prompt.length;
  return {
    charCount,
    valid: charCount > 0 && charCount <= YOUTUBE_CREATE_LIMIT,
    excess: Math.max(0, charCount - YOUTUBE_CREATE_LIMIT),
  };
}

export function calculateProjectCompletion(project: Project): {
  percent: number;
  currentStep: string;
} {
  const checks = [
    { done: evaluateBriefing(project.briefing).status === 'Pronto para produção', label: 'Briefing' },
    { done: project.scriptVersions.length > 0, label: 'Roteiro' },
    { done: project.scenes.length > 0, label: 'Divisão em Cenas' },
    {
      done:
        project.scenes.length > 0 &&
        project.scenes.every((s) => Boolean(project.imagePromptsByScene[s.id]?.[0]?.fullPrompt)),
      label: 'Prompts de Imagem',
    },
    {
      done:
        project.scenes.length > 0 &&
        project.scenes.every(
          (s) =>
            project.animationPromptsByScene[s.id]?.approved &&
            (project.animationPromptsByScene[s.id]?.charCount ?? 999) <= YOUTUBE_CREATE_LIMIT
        ),
      label: 'Animação YouTube Create',
    },
    { done: project.narrationSegments.length > 0, label: 'Narração' },
    { done: project.thumbnailVariations.length > 0, label: 'Thumbnail' },
    { done: Boolean(project.seo?.selectedTitle), label: 'SEO' },
    { done: Boolean(project.qualityReport), label: 'Auditoria QA' },
  ];

  const completed = checks.filter((c) => c.done).length;
  const nextPending = checks.find((c) => !c.done);
  return {
    percent: Math.round((completed / checks.length) * 100),
    currentStep: nextPending ? nextPending.label : 'Pronto para Publicação',
  };
}

export function runLocalQualityAudit(project: Project): QualityReport {
  const items: QualityCheckItem[] = [];
  const activeScript = project.scriptVersions.find((v) => v.id === project.activeScriptId);
  const briefingEval = evaluateBriefing(project.briefing);

  items.push({
    id: 'briefing',
    category: 'Planejamento',
    label: 'Briefing e consistência de parâmetros',
    status: briefingEval.status === 'Pronto para produção' ? 'Aprovado' : 'Atenção',
    details:
      briefingEval.pendingRequired.length === 0 && briefingEval.inconsistencies.length === 0
        ? 'Todos os campos obrigatórios validados.'
        : [...briefingEval.pendingRequired, ...briefingEval.inconsistencies].join(' | '),
  });

  items.push({
    id: 'script-exists',
    category: 'Roteiro',
    label: 'Roteiro gerado e formato definido',
    status: activeScript ? 'Aprovado' : 'Reprovado',
    details: activeScript
      ? `Versão ativa "${activeScript.label}" (${activeScript.recommendedFormat}).`
      : 'Nenhum roteiro gerado ainda.',
  });

  if (activeScript) {
    const firstPersonMatches = activeScript.fullText.match(
      /\b(eu acho|eu vi|meu canal|eu vou|na minha opinião)\b/gi
    );
    items.push({
      id: 'third-person',
      category: 'Roteiro',
      label: 'Narração em terceira pessoa (PT-BR)',
      status: firstPersonMatches ? 'Atenção' : 'Aprovado',
      details: firstPersonMatches
        ? `Expressões em 1ª pessoa detectadas: ${firstPersonMatches.join(', ')}`
        : 'Texto consistente com narração em 3ª pessoa.',
    });

    items.push({
      id: 'facts-vs-theories',
      category: 'Confiabilidade',
      label: 'Distinção entre fatos confirmados, cânone e teorias',
      status: activeScript.factVsTheoryNotes.length > 0 ? 'Aprovado' : 'Atenção',
      details:
        activeScript.factVsTheoryNotes.length > 0
          ? `${activeScript.factVsTheoryNotes.length} notas de verificação registradas.`
          : 'Adicione notas diferenciando anime, mangá, cânone e teorias.',
    });
  }

  const maxSceneExceeded = project.scenes.filter((s) => s.durationSec > 10);
  items.push({
    id: 'scene-duration',
    category: 'Cenas',
    label: 'Quantidade e duração das cenas (até 10s)',
    status:
      project.scenes.length === 0
        ? 'Pendente'
        : maxSceneExceeded.length === 0
          ? 'Aprovado'
          : 'Reprovado',
    details:
      project.scenes.length === 0
        ? 'Roteiro ainda não dividido em cenas.'
        : maxSceneExceeded.length === 0
          ? `${project.scenes.length} cenas respeitam o limite máximo de 10 segundos.`
          : `Cenas acima de 10s: ${maxSceneExceeded.map((s) => `#${s.number}`).join(', ')}`,
  });

  const missingImages = project.scenes.filter(
    (s) =>
      !project.imagePromptsByScene[s.id]?.[0]?.fullPrompt ||
      !project.imagePromptsByScene[s.id]?.[1]?.fullPrompt
  );
  items.push({
    id: 'images',
    category: 'Continuidade Visual',
    label: 'Dois prompts independentes por cena (Gemini)',
    status:
      project.scenes.length === 0
        ? 'Pendente'
        : missingImages.length === 0
          ? 'Aprovado'
          : 'Atenção',
    details:
      project.scenes.length === 0
        ? 'Aguardando divisão de cenas.'
        : missingImages.length === 0
          ? 'Todas as cenas possuem 2 prompts independentes.'
          : `Faltam prompts em ${missingImages.length} cena(s).`,
  });

  const invalidAnims = project.scenes.filter((s) => {
    const anim = project.animationPromptsByScene[s.id];
    return !anim || anim.charCount === 0 || anim.charCount > YOUTUBE_CREATE_LIMIT;
  });

  items.push({
    id: 'anim-limit',
    category: 'YouTube Create',
    label: 'Limite máximo de 900 caracteres por prompt',
    status:
      project.scenes.length === 0
        ? 'Pendente'
        : invalidAnims.length === 0
          ? 'Aprovado'
          : 'Reprovado',
    details:
      project.scenes.length === 0
        ? 'Aguardando divisão de cenas.'
        : invalidAnims.length === 0
          ? 'Todos os prompts de animação estão aprovados dentro do limite de 900 caracteres.'
          : `${invalidAnims.length} cena(s) sem prompt válido ou excedendo 900 caracteres.`,
  });

  const musicMentions = project.scenes.filter((s) => {
    const txt = project.animationPromptsByScene[s.id]?.prompt || '';
    return /\b(música|musica|trilha sonora|soundtrack|bgm|background music)\b/i.test(txt);
  });

  items.push({
    id: 'no-music',
    category: 'YouTube Create',
    label: 'Ausência de música e trilha sonora',
    status: musicMentions.length === 0 ? 'Aprovado' : 'Atenção',
    details:
      musicMentions.length === 0
        ? 'Nenhuma referência a música ou trilha sonora detectada.'
        : `Revisar menção em: ${musicMentions.map((s) => `Cena #${s.number}`).join(', ')}`,
  });

  const hasSubLink = Boolean(project.seo?.description?.includes(MANDATORY_SUBSCRIBE_URL));
  items.push({
    id: 'seo-link',
    category: 'SEO e Metadados',
    label: 'Metadados completos e link obrigatório do canal',
    status: project.seo ? (hasSubLink ? 'Aprovado' : 'Reprovado') : 'Pendente',
    details: !project.seo
      ? 'Metadados de SEO ainda não gerados.'
      : hasSubLink
        ? 'Link obrigatório incluído na descrição.'
        : `Falta incluir ${MANDATORY_SUBSCRIBE_URL} na descrição.`,
  });

  items.push({
    id: 'copyright-synthetic',
    category: 'Direitos Autorais e Monetização',
    label: 'Declaração de conteúdo sintético (IA) e riscos de reutilização',
    status:
      project.briefing.copyright.syntheticContentDeclaration === 'Sim (IA)'
        ? 'Aprovado'
        : 'Atenção',
    details:
      'Confirme o aviso de conteúdo alterado/sintético no YouTube Studio e revise se há material de terceiros sem transformação suficiente.',
  });

  let overallStatus: QualityLevel = 'Aprovado';
  if (items.some((i) => i.status === 'Reprovado')) overallStatus = 'Reprovado';
  else if (items.some((i) => i.status === 'Atenção' || i.status === 'Pendente'))
    overallStatus = 'Atenção';

  return {
    checkedAt: new Date().toISOString(),
    overallStatus,
    items,
    disclaimer:
      'Aviso importante: Esta auditoria orienta boas práticas editoriais e técnicas, mas NÃO garante aprovação de monetização nem ausência de reivindicações de direitos autorais.',
  };
}
