import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const PORT = 3000;

interface StructuredApiError {
  error: string;
  code: string;
  httpStatus: number;
  cause: string;
  instructions: string[];
  rawDetail?: string;
}

const PAID_MODELS = new Set([
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3-pro-image',
  'gemini-nano-banana-2.1',
  'gemini-3.1-flash-lite-image',
  'gemini-omni-1.2-flash',
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY não configurada no servidor. Verifique Settings > Secrets.'
    ) as Error & { structured?: StructuredApiError };
    err.structured = {
      error: 'Chave da API Gemini não configurada no servidor.',
      code: 'GEMINI_KEY_MISSING',
      httpStatus: 500,
      cause: 'A variável de ambiente GEMINI_API_KEY está vazia ou ausente.',
      instructions: [
        'Abra o painel Settings > Secrets no Google AI Studio.',
        'Adicione ou selecione uma GEMINI_API_KEY válida.',
        'Recarregue a aplicação após salvar a chave.',
      ],
    };
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isGemini4Model(model: string): boolean {
  return model.startsWith('gemini-4-');
}

function classifyGeminiError(err: unknown, model?: string): StructuredApiError {
  const withStructured = err as Error & {
    structured?: StructuredApiError;
    status?: number;
  };
  if (withStructured?.structured) return withStructured.structured;

  const raw = err instanceof Error ? err.message : String(err);
  const upper = raw.toUpperCase();

  if (
    upper.includes('API_KEY_INVALID') ||
    upper.includes('API KEY NOT VALID') ||
    upper.includes('401')
  ) {
    return {
      error: 'Chave da API Gemini inválida ou expirada.',
      code: 'API_KEY_INVALID',
      httpStatus: 401,
      cause: 'A chave configurada em GEMINI_API_KEY foi rejeitada pela API do Google.',
      instructions: [
        'Acesse Settings > Secrets no Google AI Studio.',
        'Substitua GEMINI_API_KEY por uma chave ativa do Google AI Studio.',
        'Reinicie ou recarregue a página e tente novamente.',
      ],
      rawDetail: raw,
    };
  }

  if (upper.includes('PERMISSION_DENIED') || upper.includes('403')) {
    return {
      error: 'Permissão negada ou faturamento necessário para este modelo.',
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
      cause: `A chave atual não tem permissão para acessar ${model || 'o modelo solicitado'} ou exige conta com faturamento (Billing).`,
      instructions: [
        'Verifique as permissões da chave em Settings > Secrets.',
        'Para texto na camada gratuita, selecione "gemini-4-hydrogen" ou "gemini-3.1-flash-lite" em Configurações.',
        'Para geração direta de imagens ou modelos Argon/Carbon, vincule uma chave com Billing ativo no Google Cloud.',
      ],
      rawDetail: raw,
    };
  }

  if (
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('QUOTA') ||
    upper.includes('429')
  ) {
    return {
      error: 'Limite de cota ou créditos da IA atingido (429).',
      code: 'RESOURCE_EXHAUSTED',
      httpStatus: 429,
      cause: `Você atingiu o limite de requisições/tokens por minuto ou a cota gratuita do modelo ${model || 'Gemini'}.`,
      instructions: [
        'Aguarde de 30 a 60 segundos antes de enviar uma nova solicitação.',
        'Em Configurações do Estúdio, troque para "gemini-3.1-flash-lite" (menor consumo de cota).',
        'Se estiver usando modelos pagos ou geração frequente de imagens, habilite faturamento/créditos na sua conta em Settings > Secrets.',
      ],
      rawDetail: raw,
    };
  }

  if (upper.includes('NOT_FOUND') || upper.includes('404')) {
    return {
      error: `Modelo "${model || 'solicitado'}" não encontrado ou indisponível.`,
      code: 'MODEL_NOT_FOUND',
      httpStatus: 404,
      cause: 'O identificador do modelo não está disponível para esta versão da API ou região.',
      instructions: [
        'Abra o módulo Configurações no menu lateral.',
        'Selecione "gemini-4-hydrogen" para texto ou "gemini-3.1-flash-lite-image" para imagens.',
        'Tente executar a operação novamente.',
      ],
      rawDetail: raw,
    };
  }

  return {
    error: 'Falha ao processar solicitação na API Gemini.',
    code: 'GEMINI_INTERNAL_ERROR',
    httpStatus: 500,
    cause: raw || 'Erro inesperado durante a comunicação com o modelo.',
    instructions: [
      'Verifique sua conexão com a internet e tente novamente.',
      'Se o erro persistir com JSON ou roteiro longo, reduza o escopo ou altere o modelo em Configurações.',
      'Consulte os detalhes técnicos abaixo se precisar diagnosticar a resposta.',
    ],
    rawDetail: raw,
  };
}

function extractUsage(response: {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}) {
  return {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      defaultModel: 'gemini-4-hydrogen',
      imageModel: 'gemini-3.1-flash-lite-image',
    });
  });

  app.get('/api/integrations/status', (_req, res) => {
    const geminiOk = Boolean(process.env.GEMINI_API_KEY?.trim());
    const elevenOk = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
    const sheetsOk = Boolean(
      process.env.GOOGLE_SHEETS_CLIENT_ID?.trim() &&
        process.env.GOOGLE_SHEETS_CLIENT_SECRET?.trim()
    );

    res.json({
      gemini: {
        configured: geminiOk,
        message: geminiOk
          ? 'Conectado via servidor seguro (cota vinculada à conta em Settings > Secrets).'
          : 'GEMINI_API_KEY ausente em Settings > Secrets.',
        freeModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
        paidModels: Array.from(PAID_MODELS),
      },
      elevenlabs: {
        configured: elevenOk,
        message: elevenOk
          ? 'API ElevenLabs configurada no servidor (consumo de caracteres cobrado na conta ElevenLabs).'
          : 'ELEVENLABS_API_KEY não configurada. O módulo gera textos prontos para uso externo sem custo adicional.',
      },
      googleSheets: {
        configured: sheetsOk,
        message: sheetsOk
          ? 'Credenciais OAuth Google Sheets detectadas.'
          : 'OAuth do Google Sheets não configurado. Utilize a exportação em XLSX compatível com Google Sheets.',
      },
      youtubeStudio: {
        configured: false,
        message:
          'Acesso direto ao YouTube Analytics API requer OAuth 2.0 aprovado. Utilize registro manual ou importação CSV.',
      },
    });
  });

  app.post('/api/gemini/generate', async (req, res) => {
    const requestedModel = (req.body as { model?: string })?.model?.trim() || 'gemini-4-hydrogen';
    try {
      const { prompt, systemInstruction, responseMimeType } = req.body as {
        prompt: string;
        systemInstruction?: string;
        model?: string;
        responseMimeType?: string;
      };

      if (!prompt?.trim()) {
        res.status(400).json({
          error: 'O campo "prompt" é obrigatório.',
          code: 'INVALID_REQUEST',
          httpStatus: 400,
          cause: 'A requisição foi enviada sem texto de instrução para a IA.',
          instructions: ['Preencha o tema ou roteiro antes de acionar a geração.'],
        });
        return;
      }

      const ai = getGeminiClient();
      const config: Record<string, unknown> = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (requestedModel === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else if (!isGemini4Model(requestedModel)) {
        config.temperature = 0.6;
      }

      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: prompt,
        config,
      });

      res.json({
        text: response.text ?? '',
        model: requestedModel,
        tier: PAID_MODELS.has(requestedModel) ? 'paid' : 'free_compatible',
        usage: extractUsage(response),
      });
    } catch (err) {
      const classified = classifyGeminiError(err, requestedModel);
      res.status(classified.httpStatus).json(classified);
    }
  });

  app.post('/api/gemini/trends', async (req, res) => {
    const requestedModel = (req.body as { model?: string })?.model?.trim() || 'gemini-4-hydrogen';
    try {
      const { query, anime } = req.body as {
        query: string;
        anime?: string;
        model?: string;
      };

      if (!query?.trim()) {
        res.status(400).json({
          error: 'Informe um tema ou palavra-chave para pesquisa.',
          code: 'INVALID_REQUEST',
          httpStatus: 400,
          cause: 'O campo de busca de tendências está vazio.',
          instructions: ['Digite o nome do anime ou tema de pesquisa antes de buscar.'],
        });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Pesquise tendências reais e atuais sobre animes para produção de conteúdo no YouTube Brasil (canal Chakra Puro BR).
Tema/Consulta: ${query}
Anime foco: ${anime || 'Geral / Animes em alta'}

REGRAS ESTRITAS:
1. Utilize a ferramenta Google Search para fundamentar a resposta em fontes reais e atuais.
2. NÃO invente métricas numéricas (buscas mensais, views estimadas ou percentuais) se não estiverem explicitamente nas fontes encontradas.
3. Diferencie claramente FATOS CONFIRMADOS (anúncios oficiais, episódios exibidos, capítulos lançados), OPINIÕES e TEORIAS de fãs.
4. Retorne EXCLUSIVAMENTE JSON válido (sem texto antes ou depois) no formato:
{
  "items": [
    {
      "topic": "string",
      "anime": "string",
      "keyword": "string",
      "observedTrend": "string",
      "editorialPotential": "Alto | Médio | Experimental",
      "suggestedApproach": "string",
      "classification": "Fato Confirmado | Misto (Fato + Teoria) | Teoria de Fãs",
      "confirmedFacts": ["string"],
      "theoriesOrOpinions": ["string"]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk) => ({
            title: chunk.web?.title || 'Fonte Web',
            uri: chunk.web?.uri || '',
          }))
          .filter((s) => Boolean(s.uri)) ?? [];

      res.json({
        rawText: response.text ?? '',
        sources: groundingChunks,
        consultedAt: new Date().toISOString(),
        model: requestedModel,
        tier: PAID_MODELS.has(requestedModel) ? 'paid' : 'free_compatible',
        usage: extractUsage(response),
      });
    } catch (err) {
      const classified = classifyGeminiError(err, requestedModel);
      res.status(classified.httpStatus).json(classified);
    }
  });

  app.post('/api/gemini/image', async (req, res) => {
    const requestedModel =
      (req.body as { model?: string })?.model?.trim() || 'gemini-3.1-flash-lite-image';
    try {
      const { prompt, aspectRatio, referenceImageBase64, referenceMimeType } =
        req.body as {
          prompt: string;
          aspectRatio?: '16:9' | '9:16' | '1:1';
          referenceImageBase64?: string;
          referenceMimeType?: string;
          model?: string;
        };

      if (!prompt?.trim()) {
        res.status(400).json({
          error: 'Prompt da imagem é obrigatório.',
          code: 'INVALID_REQUEST',
          httpStatus: 400,
          cause: 'O prompt visual está vazio.',
          instructions: ['Gere ou preencha o prompt da imagem antes de solicitar a arte.'],
        });
        return;
      }

      const ai = getGeminiClient();
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> =
        [];

      if (referenceImageBase64 && referenceMimeType) {
        parts.push({
          inlineData: {
            data: referenceImageBase64.replace(/^data:[^;]+;base64,/, ''),
            mimeType: referenceMimeType,
          },
        });
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '9:16',
          },
        },
      });

      const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = candidateParts.find((p) => p.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        const note = candidateParts.find((p) => p.text)?.text || '';
        res.status(422).json({
          error: 'O modelo não retornou bytes de imagem para este prompt.',
          code: 'IMAGE_NOT_RETURNED',
          httpStatus: 422,
          cause:
            note ||
            'A geração direta pode ter sido bloqueada por política de conteúdo ou indisponibilidade do modelo na cota gratuita.',
          instructions: [
            'Revise o prompt removendo nomes ou termos sensíveis/restritos.',
            'Verifique se sua GEMINI_API_KEY em Settings > Secrets possui faturamento/créditos ativos para modelos de imagem.',
            'Como alternativa imediata, clique em "Copiar" e cole o prompt diretamente no Gemini.',
          ],
          rawDetail: note,
        });
        return;
      }

      res.json({
        mimeType: imagePart.inlineData.mimeType || 'image/png',
        base64: imagePart.inlineData.data,
        model: requestedModel,
        tier: 'paid',
        usage: extractUsage(response),
      });
    } catch (err) {
      const classified = classifyGeminiError(err, requestedModel);
      res.status(classified.httpStatus).json(classified);
    }
  });

  app.post('/api/integrations/elevenlabs/tts', async (req, res) => {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      res.status(501).json({
        error: 'Integração ElevenLabs não configurada no servidor.',
        code: 'ELEVENLABS_NOT_CONFIGURED',
        httpStatus: 501,
        cause: 'A variável ELEVENLABS_API_KEY não está definida no ambiente do servidor.',
        instructions: [
          'Use o botão "Copiar" em cada trecho de narração e cole diretamente no site do ElevenLabs.',
          'Para ativar geração direta no estúdio, configure ELEVENLABS_API_KEY nos Secrets do servidor.',
        ],
      });
      return;
    }

    try {
      const { text, voiceId } = req.body as { text: string; voiceId?: string };
      if (!text?.trim()) {
        res.status(400).json({
          error: 'Texto da narração é obrigatório.',
          code: 'INVALID_REQUEST',
          httpStatus: 400,
          cause: 'O campo de narração da cena está vazio.',
          instructions: ['Gere ou digite o texto da narração antes de sintetizar o áudio.'],
        });
        return;
      }

      const targetVoice = voiceId?.trim() || 'pNInz6obpgDQGcFmaJgB';
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.45, similarity_boost: 0.78 },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        res.status(resp.status).json({
          error: `Erro na API ElevenLabs (${resp.status}).`,
          code: resp.status === 401 ? 'ELEVENLABS_AUTH_ERROR' : 'ELEVENLABS_QUOTA_OR_API_ERROR',
          httpStatus: resp.status,
          cause: errText,
          instructions: [
            'Verifique se a chave ELEVENLABS_API_KEY é válida e possui caracteres/créditos disponíveis na conta ElevenLabs.',
            'Confirme se o Voice ID informado na Aba 05 do Briefing existe na sua biblioteca ElevenLabs.',
            'Enquanto isso, você pode copiar o texto preparado e usar externamente.',
          ],
          rawDetail: errText,
        });
        return;
      }

      const arrayBuffer = await resp.arrayBuffer();
      res.json({
        mimeType: 'audio/mpeg',
        base64: Buffer.from(arrayBuffer).toString('base64'),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro desconhecido';
      res.status(500).json({
        error: 'Falha de conexão com ElevenLabs.',
        code: 'ELEVENLABS_NETWORK_ERROR',
        httpStatus: 500,
        cause: raw,
        instructions: [
          'Verifique a conexão de rede do servidor e tente novamente.',
          'Utilize a cópia manual do texto se precisar continuar a produção imediatamente.',
        ],
        rawDetail: raw,
      });
    }
  });

  app.post('/api/integrations/google-sheets', (_req, res) => {
    const configured = Boolean(
      process.env.GOOGLE_SHEETS_CLIENT_ID?.trim() &&
        process.env.GOOGLE_SHEETS_CLIENT_SECRET?.trim()
    );
    if (!configured) {
      res.status(501).json({
        error: 'OAuth do Google Sheets não configurado.',
        code: 'SHEETS_OAUTH_MISSING',
        httpStatus: 501,
        cause:
          'As credenciais GOOGLE_SHEETS_CLIENT_ID e GOOGLE_SHEETS_CLIENT_SECRET não foram configuradas.',
        instructions: [
          'Clique em "Baixar Planilha XLSX" para gerar o arquivo CHAKRA_PURO_BR_BRIEFING_E_PLANEJAMENTO.xlsx.',
          'Envie o arquivo XLSX para o Google Drive e abra com o Google Planilhas (100% compatível com abas, fórmulas e listas suspensas).',
        ],
      });
      return;
    }
    res.status(501).json({
      error: 'Sessão OAuth do Google Sheets não autenticada.',
      code: 'SHEETS_OAUTH_UNAUTHENTICATED',
      httpStatus: 501,
      cause: 'Nenhum token OAuth de usuário ativo foi encontrado para gravar na conta Google.',
      instructions: [
        'Use o botão "Baixar Planilha XLSX" e importe diretamente no Google Sheets.',
      ],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chakra Puro BR — AI Video Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
