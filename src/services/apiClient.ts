import { recordAiUsage } from '../storage/settings';
import { AiTokenUsage, DiagnosticError, ModuleId } from '../types/studio';

export interface IntegrationStatusResponse {
  gemini: {
    configured: boolean;
    message: string;
    freeModels?: string[];
    paidModels?: string[];
  };
  elevenlabs: { configured: boolean; message: string };
  googleSheets: { configured: boolean; message: string };
  youtubeStudio: { configured: boolean; message: string };
}

export class StudioApiError extends Error {
  code: string;
  httpStatus?: number;
  causeText: string;
  instructions: string[];
  rawDetail?: string;

  constructor(params: {
    message: string;
    code: string;
    httpStatus?: number;
    causeText: string;
    instructions: string[];
    rawDetail?: string;
  }) {
    super(params.message);
    this.name = 'StudioApiError';
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.causeText = params.causeText;
    this.instructions = params.instructions;
    this.rawDetail = params.rawDetail;
  }
}

export function toDiagnosticError(
  err: unknown,
  moduleLabel: string,
  fallbackTarget?: { actionTarget: ModuleId; actionLabel: string }
): DiagnosticError {
  if (err instanceof StudioApiError) {
    let actionTarget = fallbackTarget?.actionTarget;
    let actionLabel = fallbackTarget?.actionLabel;
    if (
      err.code === 'MODEL_NOT_FOUND' ||
      err.code === 'RESOURCE_EXHAUSTED' ||
      err.code === 'PERMISSION_DENIED'
    ) {
      actionTarget = 'settings';
      actionLabel = 'Abrir Configurações';
    } else if (err.code === 'SHEETS_OAUTH_MISSING' || err.code === 'SHEETS_OAUTH_UNAUTHENTICATED') {
      actionTarget = 'exports';
      actionLabel = 'Ir para Exportações XLSX';
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      module: moduleLabel,
      error: err.message,
      code: err.code,
      httpStatus: err.httpStatus,
      cause: err.causeText,
      instructions: err.instructions,
      rawDetail: err.rawDetail,
      resolved: false,
      actionTarget,
      actionLabel,
    };
  }

  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('JSON') || raw.includes('Unexpected token')) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      module: moduleLabel,
      error: 'A resposta da IA não veio no formato estruturado esperado.',
      code: 'JSON_PARSE_ERROR',
      cause: 'O modelo retornou texto fora do padrão JSON esperado para este módulo.',
      instructions: [
        'Tente executar a geração novamente (respostas pontuais podem variar).',
        'Verifique se o Briefing não possui textos muito longos ou conflitantes.',
        'Se persistir, selecione "gemini-4-hydrogen" em Configurações.',
      ],
      rawDetail: raw,
      resolved: false,
      actionTarget: 'settings',
      actionLabel: 'Verificar Modelo em Configurações',
    };
  }

  if (raw.includes('Pendências essenciais')) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      module: moduleLabel,
      error: 'O Briefing possui campos obrigatórios pendentes ou inconsistências.',
      code: 'BRIEFING_INCOMPLETE',
      cause: raw,
      instructions: [
        'Abra o módulo "Novo projeto" (Briefing) e acesse a Aba 01 ou Aba 12 (Resumo).',
        'Preencha todos os campos marcados com * (Nome, Anime, Tema, Personagem, Palavra-chave SEO).',
        'Garanta que o tempo máximo por cena seja <= 10 segundos e as proporções coincidam.',
      ],
      rawDetail: raw,
      resolved: false,
      actionTarget: 'new-project',
      actionLabel: 'Corrigir no Briefing',
    };
  }

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    module: moduleLabel,
    error: raw || 'Erro inesperado durante a operação.',
    code: 'CLIENT_OR_NETWORK_ERROR',
    cause: raw || 'Falha de comunicação ou validação local.',
    instructions: [
      'Verifique se o servidor está ativo e sua conexão está estável.',
      'Recarregue a página caso o servidor tenha sido reiniciado recentemente.',
      'Confira o painel "Créditos & Diagnóstico IA" no topo para mais detalhes.',
    ],
    rawDetail: raw,
    resolved: false,
    ...fallbackTarget,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new StudioApiError({
      message: String(data.error || `Erro HTTP ${res.status}`),
      code: String(data.code || `HTTP_${res.status}`),
      httpStatus: Number(data.httpStatus || res.status),
      causeText: String(data.cause || data.error || `Servidor respondeu com status ${res.status}.`),
      instructions: Array.isArray(data.instructions)
        ? (data.instructions as string[])
        : [
            'Verifique as configurações e tente novamente.',
            'Consulte o painel de Configurações para checar o estado das integrações.',
          ],
      rawDetail: data.rawDetail ? String(data.rawDetail) : undefined,
    });
  }
  return data as T;
}

export const apiClient = {
  getHealth: () =>
    fetch('/api/health').then((r) =>
      handleResponse<{
        ok: boolean;
        geminiConfigured: boolean;
        defaultModel: string;
        imageModel: string;
      }>(r)
    ),

  getIntegrationsStatus: () =>
    fetch('/api/integrations/status').then((r) =>
      handleResponse<IntegrationStatusResponse>(r)
    ),

  generateText: async (payload: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
    responseMimeType?: string;
  }) => {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) =>
      handleResponse<{
        text: string;
        model: string;
        tier?: 'free_compatible' | 'paid';
        usage?: AiTokenUsage;
      }>(r)
    );
    recordAiUsage({
      model: res.model,
      tier: res.tier || 'free_compatible',
      usage: res.usage,
    });
    return res;
  },

  searchTrends: async (payload: { query: string; anime?: string; model?: string }) => {
    const res = await fetch('/api/gemini/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) =>
      handleResponse<{
        rawText: string;
        sources: Array<{ title: string; uri: string }>;
        consultedAt: string;
        model: string;
        tier?: 'free_compatible' | 'paid';
        usage?: AiTokenUsage;
      }>(r)
    );
    recordAiUsage({
      model: res.model,
      tier: res.tier || 'free_compatible',
      usage: res.usage,
    });
    return res;
  },

  generateImage: async (payload: {
    prompt: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    referenceImageBase64?: string;
    referenceMimeType?: string;
    model?: string;
  }) => {
    const res = await fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) =>
      handleResponse<{
        mimeType: string;
        base64: string;
        model: string;
        tier?: 'free_compatible' | 'paid';
        usage?: AiTokenUsage;
      }>(r)
    );
    recordAiUsage({
      model: res.model,
      tier: res.tier || 'paid',
      usage: res.usage,
      isImage: true,
    });
    return res;
  },

  generateElevenLabsAudio: (payload: { text: string; voiceId?: string }) =>
    fetch('/api/integrations/elevenlabs/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<{ mimeType: string; base64: string }>(r)),

  exportToGoogleSheets: (payload: unknown) =>
    fetch('/api/integrations/google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<{ url: string }>(r)),
};
