import { AiTokenUsage, AiUsageLedger, StudioSettings } from '../types/studio';

const SETTINGS_KEY = 'chakra_puro_studio_settings_v1';
const USAGE_KEY = 'chakra_puro_studio_ai_usage_v1';

export const DEFAULT_SETTINGS: StudioSettings = {
  geminiModel: 'gemini-4-hydrogen',
  geminiImageModel: 'gemini-3.1-flash-lite-image',
  language: 'pt-BR',
  defaultAspectRatio: '9:16',
  exportAuthor: 'Chakra Puro BR Studio',
  autoSaveEnabled: true,
};

export const EMPTY_USAGE_LEDGER: AiUsageLedger = {
  totalRequests: 0,
  promptTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  imageGenerations: 0,
  byModel: {},
};

export function loadSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: StudioSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadUsageLedger(): AiUsageLedger {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return EMPTY_USAGE_LEDGER;
    return { ...EMPTY_USAGE_LEDGER, ...JSON.parse(raw) };
  } catch {
    return EMPTY_USAGE_LEDGER;
  }
}

export function recordAiUsage(params: {
  model: string;
  tier: 'free_compatible' | 'paid';
  usage?: AiTokenUsage;
  isImage?: boolean;
}): AiUsageLedger {
  const current = loadUsageLedger();
  const promptTokens = params.usage?.promptTokens ?? 0;
  const outputTokens = params.usage?.outputTokens ?? 0;
  const totalTokens = params.usage?.totalTokens ?? promptTokens + outputTokens;

  const prevModel = current.byModel[params.model] || {
    requests: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    tier: params.tier,
  };

  const next: AiUsageLedger = {
    totalRequests: current.totalRequests + 1,
    promptTokens: current.promptTokens + promptTokens,
    outputTokens: current.outputTokens + outputTokens,
    totalTokens: current.totalTokens + totalTokens,
    imageGenerations: current.imageGenerations + (params.isImage ? 1 : 0),
    lastModelUsed: params.model,
    lastTierUsed: params.tier,
    lastUpdatedAt: new Date().toISOString(),
    byModel: {
      ...current.byModel,
      [params.model]: {
        requests: prevModel.requests + 1,
        promptTokens: prevModel.promptTokens + promptTokens,
        outputTokens: prevModel.outputTokens + outputTokens,
        totalTokens: prevModel.totalTokens + totalTokens,
        tier: params.tier,
      },
    },
  };

  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('chakra-ai-usage-updated', { detail: next }));
  return next;
}

export function resetUsageLedger(): AiUsageLedger {
  localStorage.setItem(USAGE_KEY, JSON.stringify(EMPTY_USAGE_LEDGER));
  window.dispatchEvent(
    new CustomEvent('chakra-ai-usage-updated', { detail: EMPTY_USAGE_LEDGER })
  );
  return EMPTY_USAGE_LEDGER;
}

export function sanitizeForBackup<T>(data: T): T {
  const json = JSON.stringify(data, (key, value) => {
    if (/apiKey|secret|token|password|credential/i.test(key)) {
      return undefined;
    }
    return value;
  });
  return JSON.parse(json) as T;
}
