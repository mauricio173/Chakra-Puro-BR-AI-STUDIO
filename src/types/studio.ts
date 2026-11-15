export type ModuleId =
  | 'dashboard'
  | 'new-project'
  | 'projects'
  | 'trends'
  | 'scriptwriter'
  | 'images'
  | 'videos'
  | 'narration'
  | 'thumbnail'
  | 'seo'
  | 'analytics'
  | 'characters'
  | 'prompts'
  | 'exports'
  | 'settings';

export type ProjectStatus =
  | 'rascunho'
  | 'em_andamento'
  | 'revisao'
  | 'pronto_publicacao'
  | 'publicado'
  | 'arquivado';

export type BriefingStatus =
  | 'Não iniciado'
  | 'Em preenchimento'
  | 'Incompleto'
  | 'Pronto para produção';

export type NarrativeFormatCode =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | '';

export const NARRATIVE_FORMATS: Record<Exclude<NarrativeFormatCode, ''>, string> = {
  A: 'CTA + GANCHO',
  B: 'INTRODUÇÃO + CURIOSIDADE',
  C: 'GANCHO + MISTÉRIO + REVELAÇÃO',
  D: 'TEORIA + EVIDÊNCIAS + CONCLUSÃO',
  E: 'HISTÓRIA + QUEBRA DE EXPECTATIVA',
  F: 'COMPARAÇÃO POLÊMICA',
  G: 'CONTAGEM REGRESSIVA',
  H: 'PERGUNTA + RESPOSTA SURPREENDENTE',
  I: 'SEGREDO REVELADO',
  J: 'NARRATIVA CINEMATOGRÁFICA',
};

export const EMOTIONAL_STYLES = [
  'Suspense',
  'Dramático',
  'Épico',
  'Misterioso',
  'Investigativo',
  'Emocionante',
  'Humorístico',
  'Intenso',
  'Informativo',
] as const;

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Padrão Rápido)' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Econômico)' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon (Raciocínio Avançado)' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (Profundidade Máxima)' },
] as const;

export const AVAILABLE_IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash Lite Image' },
  { id: 'gemini-nano-banana-2.1', label: 'Nano Banana 2.1 (Alta Resolução)' },
] as const;

export interface Briefing {
  identification: {
    projectName: string;
    anime: string;
    mainTheme: string;
    mainCharacter: string;
    secondaryCharacters: string;
    episodeOrSaga: string;
    referenceOrEvent: string;
    videoObjective: string;
    targetAudience: string;
    plannedDate: string;
    notes: string;
  };
  duration: {
    videoType: 'Short' | 'Vídeo Longo';
    desiredDurationSeconds: number;
    maxSceneSeconds: number;
    sceneCount: number;
    aspectRatio: '9:16' | '16:9';
    narrativePace: 'Lento' | 'Equilibrado' | 'Dinâmico' | 'Frenético';
    narrationSpeed: 'Lenta' | 'Normal' | 'Rápida';
    autoSplit: boolean;
    notes: string;
  };
  narrativeFormat: {
    primaryFormat: NarrativeFormatCode;
    secondaryFormat: NarrativeFormatCode;
    formatCombination: string;
    hookType: string;
    development: string;
    revelation: string;
    ending: string;
    cta: string;
    narrativeIntensity: 'Moderada' | 'Alta' | 'Extrema';
  };
  narrationStyle: {
    voiceTone: string;
    emotionalStyle: (typeof EMOTIONAL_STYLES)[number];
    intensity: 'Suave' | 'Média' | 'Forte' | 'Épica';
    speed: string;
    voiceGender: 'Masculina' | 'Feminina';
    elevenLabsVoiceRef: string;
    pronunciationNotes: string;
    pauseNotes: string;
    interpretationPrefs: string;
  };
  visualIdentity: {
    animeStyle: string;
    aestheticRef: string;
    colorPalette: string;
    lighting: string;
    environments: string;
    characters: string;
    physicalAppearance: string;
    clothing: string;
    expressions: string;
    cameraAngles: string;
    detailLevel: string;
    visualContinuity: string;
    aspectRatio: '9:16' | '16:9';
    usageRestrictions: string;
    referenceLinks: string;
  };
  animationSfx: {
    characterMovement: string;
    cameraMovement: string;
    intensity: 'Sutil' | 'Moderada' | 'Intensa';
    environmentMovement: string;
    visualEffects: string;
    soundEffects: string;
    impacts: string;
    naturalSounds: string;
    transitions: string;
    soundtrackDisabled: true;
    musicDisabled: true;
    youtubeCreateMaxChars: 900;
  };
  thumbnail: {
    mainCharacter: string;
    mainText: string;
    secondaryText: string;
    expression: string;
    background: string;
    style: string;
    colors: string;
    composition: string;
    aspectRatio: '16:9';
  };
  seo: {
    primaryKeyword: string;
    secondaryKeywords: string;
    desiredTitle: string;
    titleStyle: string;
    description: string;
    hashtags: string;
    tags: string;
    pinnedComment: string;
    cta: string;
    spoilers: 'Sem spoilers' | 'Spoilers leves' | 'Spoilers pesados';
    publishDateTime: string;
  };
  copyright: {
    madeForKids: 'Não' | 'Sim' | 'Não informado';
    hasSpoilers: 'Sim' | 'Não' | 'Não informado';
    protectedCharacters: string;
    thirdPartyMaterials: string;
    externalImages: string;
    externalAudios: string;
    authorizations: string;
    syntheticContentDeclaration: 'Sim (IA)' | 'Não' | 'Avaliar antes de publicar';
    additionalRestrictions: string;
  };
  preferences: {
    ideas: string;
    references: string;
    mandatoryElements: string;
    forbiddenElements: string;
    characters: string;
    preferences: string;
    specialInstructions: string;
  };
}

export interface ScriptVersion {
  id: string;
  createdAt: string;
  label: string;
  recommendedFormat: string;
  justification: string;
  hook: string;
  development: string;
  revelation: string;
  ending: string;
  cta: string;
  fullText: string;
  approaches: string[];
  factVsTheoryNotes: string[];
  spoilerAlert: string;
}

export interface SceneItem {
  id: string;
  number: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  narration: string;
  narrativeObjective: string;
  visualDescription: string;
  characters: string[];
  emotion: string;
  action: string;
  soundEffects: string;
  transition: string;
}

export interface SceneImagePrompt {
  id: string;
  variant: 1 | 2;
  character: string;
  appearance: string;
  clothing: string;
  expression: string;
  position: string;
  scenery: string;
  lighting: string;
  composition: string;
  angle: string;
  depth: string;
  visualStyle: string;
  aspectRatio: '9:16' | '16:9';
  fullPrompt: string;
  generatedImageId?: string;
  referenceImageId?: string;
  saved?: boolean;
}

export interface SceneAnimationPrompt {
  sceneId: string;
  prompt: string;
  charCount: number;
  approved: boolean;
  validationError?: string;
}

export interface NarrationSegment {
  sceneId: string;
  sceneNumber: number;
  text: string;
  estimatedSeconds: number;
  emotionalIntent: string;
  pauses: string;
  pronunciation: string;
  emphasis: string;
  rhythm: string;
  audioAssetId?: string;
}

export interface ThumbnailVariation {
  id: string;
  title: string;
  visualConcept: string;
  mainText: string;
  secondaryText: string;
  composition: string;
  geminiPrompt: string;
  generatedImageId?: string;
}

export interface SeoMetadata {
  titleOptions: string[];
  selectedTitle: string;
  description: string;
  hashtags: string[];
  tags: string[];
  keywords: string[];
  pinnedComment: string;
  cta: string;
  spoilerNotice: string;
}

export type QualityLevel = 'Aprovado' | 'Atenção' | 'Pendente' | 'Reprovado';

export interface QualityCheckItem {
  id: string;
  category: string;
  label: string;
  status: QualityLevel;
  details: string;
}

export interface QualityReport {
  checkedAt: string;
  overallStatus: QualityLevel;
  items: QualityCheckItem[];
  disclaimer: string;
}

export interface TrendResultItem {
  topic: string;
  anime: string;
  keyword: string;
  observedTrend: string;
  editorialPotential: 'Alto' | 'Médio' | 'Experimental';
  suggestedApproach: string;
  classification: string;
  confirmedFacts: string[];
  theoriesOrOpinions: string[];
}

export interface TrendSearchRecord {
  id: string;
  query: string;
  consultedAt: string;
  sources: Array<{ title: string; uri: string }>;
  items: TrendResultItem[];
}

export interface PerformanceRecord {
  id: string;
  projectId?: string;
  videoTitle: string;
  publishedAt: string;
  views: number;
  engagedViews: number;
  choseToWatchPct: number;
  swipedAwayPct: number;
  retentionPct: number;
  avgDurationSec: number;
  avgPercentageViewed: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  revenueUsd: number;
  rpmUsd: number;
  notes?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  anime: string;
  appearance: string;
  clothing: string;
  apparentAge: string;
  traits: string;
  expressions: string;
  palette: string;
  visualStyle: string;
  referenceImageId?: string;
  previousPrompts: string[];
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'Imagem' | 'Animação' | 'Narração' | 'Thumbnail' | 'SEO';
  anime: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  currentStep: string;
  completionPercent: number;
  exportedDocsCount: number;
  briefing: Briefing;
  trendSearches: TrendSearchRecord[];
  scriptVersions: ScriptVersion[];
  activeScriptId?: string;
  scenes: SceneItem[];
  imagePromptsByScene: Record<string, [SceneImagePrompt, SceneImagePrompt]>;
  animationPromptsByScene: Record<string, SceneAnimationPrompt>;
  narrationSegments: NarrationSegment[];
  thumbnailVariations: ThumbnailVariation[];
  seo?: SeoMetadata;
  qualityReport?: QualityReport;
  history: Array<{ id: string; timestamp: string; action: string }>;
}

export interface StudioSettings {
  geminiModel: string;
  geminiImageModel: string;
  language: 'pt-BR';
  defaultAspectRatio: '9:16' | '16:9';
  exportAuthor: string;
  autoSaveEnabled: boolean;
}

export interface AiTokenUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiUsageLedger {
  totalRequests: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  imageGenerations: number;
  lastModelUsed?: string;
  lastTierUsed?: 'free_compatible' | 'paid';
  lastUpdatedAt?: string;
  byModel: Record<
    string,
    {
      requests: number;
      promptTokens: number;
      outputTokens: number;
      totalTokens: number;
      tier: 'free_compatible' | 'paid';
    }
  >;
}

export interface DiagnosticError {
  id: string;
  timestamp: string;
  module: string;
  error: string;
  code: string;
  httpStatus?: number;
  cause: string;
  instructions: string[];
  rawDetail?: string;
  resolved: boolean;
  actionTarget?: ModuleId;
  actionLabel?: string;
}
