import {
  Briefing,
  CharacterProfile,
  NarrationSegment,
  PerformanceRecord,
  SceneAnimationPrompt,
  SceneImagePrompt,
  SceneItem,
  ScriptVersion,
  SeoMetadata,
  StudioSettings,
  ThumbnailVariation,
  TrendSearchRecord,
} from '../types/studio';
import { MANDATORY_SUBSCRIBE_URL, YOUTUBE_CREATE_LIMIT } from '../utils/validation';
import { apiClient } from './apiClient';

function parseJsonSafe<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  return JSON.parse(slice) as T;
}

const STUDIO_SYSTEM_INSTRUCTION = `Você é a equipe criativa sênior do canal "Chakra Puro BR" (animes no YouTube Brasil).
Regras permanentes e inegociáveis:
- Escreva em Português do Brasil natural, fluido e cinematográfico.
- Narração SEMPRE em TERCEIRA PESSOA.
- Nunca invente fatos; diferencie explicitamente Anime, Mangá, Cânone e Teorias/Opiniões.
- Sinalize spoilers claramente quando aplicável.
- Nos prompts de animação YouTube Create, NUNCA inclua música, trilha sonora ou diálogos improvisados.
- Quando solicitado JSON, retorne exclusivamente JSON válido sem markdown extra.`;

export const aiService = {
  async researchTrends(
    query: string,
    anime: string,
    settings: StudioSettings
  ): Promise<TrendSearchRecord> {
    const res = await apiClient.searchTrends({
      query,
      anime,
      model: settings.geminiModel,
    });
    let items: TrendSearchRecord['items'] = [];
    try {
      const parsed = parseJsonSafe<{ items: TrendSearchRecord['items'] }>(res.rawText);
      items = parsed.items ?? [];
    } catch {
      items = [
        {
          topic: query,
          anime: anime || 'Geral',
          keyword: query,
          observedTrend: res.rawText.slice(0, 800),
          editorialPotential: 'Médio',
          suggestedApproach: 'Revisar os pontos retornados e validar as fontes listadas.',
          classification: 'Misto (Fato + Teoria)',
          confirmedFacts: [],
          theoriesOrOpinions: [],
        },
      ];
    }

    return {
      id: crypto.randomUUID(),
      query,
      consultedAt: res.consultedAt,
      sources: res.sources,
      items,
    };
  },

  async generateScript(
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<ScriptVersion> {
    const prompt = `Com base no briefing abaixo, produza um roteiro completo, original e de alta retenção para o canal Chakra Puro BR.
Se "primaryFormat" estiver vazio, escolha e justifique o melhor formato narrativo entre A..J.
BRIEFING: ${JSON.stringify(briefing)}

Retorne JSON válido com os campos:
{
  "recommendedFormat": "Código + Nome do formato",
  "justification": "Justificativa editorial para a escolha do formato",
  "approaches": ["Abordagem 1", "Abordagem 2", "Abordagem 3"],
  "hook": "Gancho forte nos 3 primeiros segundos (sem introdução longa)",
  "development": "Desenvolvimento com curiosidade progressiva e transições naturais",
  "revelation": "Revelação estratégica do ponto central",
  "ending": "Fechamento com recompensa narrativa",
  "cta": "Chamada para ação natural",
  "fullText": "Texto corrido completo pronto para narração em 3ª pessoa PT-BR",
  "factVsTheoryNotes": ["Diferenciação explícita entre anime, mangá, cânone e teorias"],
  "spoilerAlert": "Indicação clara sobre spoilers"
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<Omit<ScriptVersion, 'id' | 'createdAt' | 'label'>>(
      res.text
    );
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Versão ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      ...data,
    };
  },

  async refineScriptSection(
    current: ScriptVersion,
    instruction: string,
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<ScriptVersion> {
    const prompt = `Você está refinando UM TRECHO OU ASPECTO ESPECÍFICO de um roteiro já aprovado.
REGRA CRÍTICA: Altere SOMENTE o que foi pedido na instrução abaixo, preservando intactas todas as outras partes e informações válidas do roteiro.
Instrução do usuário: "${instruction}"
Contexto: ${briefing.identification.anime} — ${briefing.identification.mainTheme}
Roteiro atual JSON: ${JSON.stringify(current)}

Retorne JSON válido com exatamente os mesmos campos: recommendedFormat, justification, approaches, hook, development, revelation, ending, cta, fullText, factVsTheoryNotes, spoilerAlert.`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<Omit<ScriptVersion, 'id' | 'createdAt' | 'label'>>(
      res.text
    );
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Refino: ${instruction.slice(0, 28)}`,
      ...data,
    };
  },

  async splitScriptIntoScenes(
    script: ScriptVersion,
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<SceneItem[]> {
    const maxSec = Math.min(10, Math.max(3, briefing.duration.maxSceneSeconds || 8));
    const prompt = `Divida o roteiro abaixo em cenas sequenciais para produção audiovisual.
REGRAS CRÍTICAS:
1. Cada cena DEVE ter duração entre 3 e ${maxSec} segundos (NUNCA acima de 10 segundos).
2. NÃO corte frases ou ideias de forma artificial no meio.
3. Mantenha continuidade visual e narrativa entre cenas consecutivas.
Duração total alvo: ${briefing.duration.desiredDurationSeconds}s.

ROTEIRO:
${script.fullText}

Retorne JSON válido:
{
  "scenes": [
    {
      "number": 1,
      "startTime": "00:00",
      "endTime": "00:07",
      "durationSec": 7,
      "narration": "Trecho exato da narração",
      "narrativeObjective": "Gancho / Escalada / Revelação / Recompensa / CTA",
      "visualDescription": "Descrição visual detalhada da cena",
      "characters": ["Nome do personagem"],
      "emotion": "Emoção dominante",
      "action": "Ação física executada na cena (sem falar a narração)",
      "soundEffects": "Efeitos sonoros naturais/impacto (SEM MÚSICA)",
      "transition": "Corte seco / Whip pan / Dissolve"
    }
  ]
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ scenes: Array<Omit<SceneItem, 'id'>> }>(res.text);
    return (data.scenes || []).map((s, idx) => ({
      ...s,
      id: crypto.randomUUID(),
      number: idx + 1,
      durationSec: Math.min(10, Math.max(1, Number(s.durationSec) || maxSec)),
    }));
  },

  async regenerateSingleScene(
    scene: SceneItem,
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<SceneItem> {
    const prompt = `Reescreva e aprimore APENAS esta cena (#${scene.number}) mantendo coerência com o anime ${briefing.identification.anime} e duração <= ${Math.min(10, briefing.duration.maxSceneSeconds)}s.
Cena atual: ${JSON.stringify(scene)}

Retorne JSON válido com os campos: startTime, endTime, durationSec, narration, narrativeObjective, visualDescription, characters, emotion, action, soundEffects, transition.`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const updated = parseJsonSafe<Omit<SceneItem, 'id' | 'number'>>(res.text);
    return {
      ...scene,
      ...updated,
      durationSec: Math.min(10, Math.max(1, Number(updated.durationSec) || scene.durationSec)),
    };
  },

  async generateImagePromptsForScene(
    scene: SceneItem,
    briefing: Briefing,
    characters: CharacterProfile[],
    settings: StudioSettings
  ): Promise<[SceneImagePrompt, SceneImagePrompt]> {
    const charContext = characters
      .filter((c) =>
        scene.characters.some((sc) => sc.toLowerCase().includes(c.name.toLowerCase()))
      )
      .map(
        (c) =>
          `${c.name}: aparência=${c.appearance}; roupa=${c.clothing}; idade=${c.apparentAge}; paleta=${c.palette}; estilo=${c.visualStyle}`
      );

    const prompt = `Crie EXATAMENTE 2 prompts de imagem independentes e visualmente consistentes para gerar quadros desta cena no Gemini.
Anime: ${briefing.identification.anime}
Proporção obrigatória: ${briefing.visualIdentity.aspectRatio}
Estilo visual: ${briefing.visualIdentity.animeStyle}
Paleta de cores: ${briefing.visualIdentity.colorPalette}
Iluminação: ${briefing.visualIdentity.lighting}
Restrições: ${briefing.visualIdentity.usageRestrictions}
Fichas de referência de personagens: ${charContext.join(' | ') || briefing.visualIdentity.physicalAppearance}

CENA #${scene.number}:
Descrição visual: ${scene.visualDescription}
Ação: ${scene.action}
Emoção: ${scene.emotion}

Retorne JSON válido com array "prompts" de exatamente 2 objetos (variant 1 e variant 2):
{
  "prompts": [
    {
      "variant": 1,
      "character": "string",
      "appearance": "string",
      "clothing": "string",
      "expression": "string",
      "position": "string",
      "scenery": "string",
      "lighting": "string",
      "composition": "string",
      "angle": "string",
      "depth": "string",
      "visualStyle": "string",
      "aspectRatio": "${briefing.visualIdentity.aspectRatio}",
      "fullPrompt": "Prompt único completo em inglês técnico cinematográfico pronto para copiar ou gerar no Gemini"
    },
    { "variant": 2, "character": "...", "appearance": "...", "clothing": "...", "expression": "...", "position": "...", "scenery": "...", "lighting": "...", "composition": "...", "angle": "...", "depth": "...", "visualStyle": "...", "aspectRatio": "${briefing.visualIdentity.aspectRatio}", "fullPrompt": "..." }
  ]
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ prompts: Array<Omit<SceneImagePrompt, 'id'>> }>(
      res.text
    );
    const p1: SceneImagePrompt = {
      ...data.prompts[0],
      id: crypto.randomUUID(),
      variant: 1,
      aspectRatio: briefing.visualIdentity.aspectRatio,
    };
    const p2: SceneImagePrompt = {
      ...(data.prompts[1] || data.prompts[0]),
      id: crypto.randomUUID(),
      variant: 2,
      aspectRatio: briefing.visualIdentity.aspectRatio,
    };
    return [p1, p2];
  },

  async generateAnimationPromptForScene(
    scene: SceneItem,
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<SceneAnimationPrompt> {
    const prompt = `Crie 1 prompt independente de animação para o YouTube Create (cena #${scene.number}).
REGRAS PERMANENTES E CRÍTICAS:
1. O campo "prompt" DEVE ter no máximo 900 caracteres, incluindo espaços e pontuação (alvo ideal: entre 550 e 820 caracteres).
2. NUNCA mencione música, trilha sonora, BGM ou diálogos improvisados.
3. Os personagens interpretam fisicamente a ação da cena e NÃO falam a narração.
4. Inclua: movimento dos personagens, gestos, expressões, movimento de câmera, profundidade, movimento ambiental, transições, efeitos visuais, ritmo e efeitos sonoros secos.

Cena: ${scene.visualDescription}
Ação: ${scene.action}
Emoção: ${scene.emotion}
Efeitos sonoros: ${scene.soundEffects}
Transição: ${scene.transition}
Diretrizes de movimento: ${briefing.animationSfx.characterMovement}; câmera: ${briefing.animationSfx.cameraMovement}

Retorne JSON válido: { "prompt": "texto <= 900 chars" }`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ prompt: string }>(res.text);
    let text = (data.prompt || '').trim();

    if (text.length > YOUTUBE_CREATE_LIMIT) {
      text = await this.optimizeAnimationPrompt(text, settings);
    }

    const valid = text.length > 0 && text.length <= YOUTUBE_CREATE_LIMIT;
    return {
      sceneId: scene.id,
      prompt: text,
      charCount: text.length,
      approved: valid,
      validationError: valid
        ? undefined
        : `Excede o limite de 900 caracteres (${text.length}/900).`,
    };
  },

  async optimizeAnimationPrompt(
    overlimitPrompt: string,
    settings: StudioSettings
  ): Promise<string> {
    const prompt = `O prompt de animação abaixo possui ${overlimitPrompt.length} caracteres e ULTRAPASSOU o limite máximo de 900 caracteres do YouTube Create.
Reescreva preservando todas as instruções essenciais (movimento, gestos, câmera, profundidade, atmosfera, efeitos visuais e efeitos sonoros secos sem música), garantindo ESTRITAMENTE menos de 850 caracteres contando espaços.
Prompt original:
"""${overlimitPrompt}"""

Retorne JSON válido: { "optimizedPrompt": "..." }`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ optimizedPrompt: string }>(res.text);
    return (data.optimizedPrompt || '').trim();
  },

  async generateNarrationPlan(
    scenes: SceneItem[],
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<NarrationSegment[]> {
    const prompt = `Prepare o roteiro de narração segmentado para ElevenLabs em Português do Brasil (3ª pessoa).
Estilo emocional: ${briefing.narrationStyle.emotionalStyle}
Tom de voz: ${briefing.narrationStyle.voiceTone}
Intensidade: ${briefing.narrationStyle.intensity}
Notas de pronúncia: ${briefing.narrationStyle.pronunciationNotes}
Notas de pausas: ${briefing.narrationStyle.pauseNotes}

CENAS: ${JSON.stringify(
      scenes.map((s) => ({
        id: s.id,
        number: s.number,
        narration: s.narration,
        durationSec: s.durationSec,
        emotion: s.emotion,
      }))
    )}

Retorne JSON válido:
{
  "segments": [
    {
      "sceneId": "id exato da cena",
      "sceneNumber": 1,
      "text": "Texto pronto para ElevenLabs com pontuação de respiração",
      "estimatedSeconds": 7,
      "emotionalIntent": "string",
      "pauses": "Indicação de pausas",
      "pronunciation": "Guia de pronúncia",
      "emphasis": "Palavras com ênfase",
      "rhythm": "Ritmo"
    }
  ]
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ segments: NarrationSegment[] }>(res.text);
    return data.segments || [];
  },

  async generateThumbnails(
    briefing: Briefing,
    settings: StudioSettings
  ): Promise<ThumbnailVariation[]> {
    const prompt = `Crie 3 variações de conceito de Thumbnail para YouTube do canal Chakra Puro BR.
Configuração padrão obrigatória: proporção 16:9, personagem em destaque, expressão impactante, contraste elevado, fonte Barlow, texto branco e amarelo com contorno preto espesso, poucas palavras legíveis em dispositivos móveis.
Anime: ${briefing.identification.anime}
Tema: ${briefing.identification.mainTheme}
Personagem principal: ${briefing.thumbnail.mainCharacter || briefing.identification.mainCharacter}

Retorne JSON válido:
{
  "variations": [
    {
      "title": "Conceito 1 — Nome curto",
      "visualConcept": "Conceito visual e psicológico de clique",
      "mainText": "2 A 4 PALAVRAS",
      "secondaryText": "1 A 2 PALAVRAS",
      "composition": "Composição detalhada 16:9",
      "geminiPrompt": "Prompt completo 16:9 em inglês cinematográfico para Gemini"
    }
  ]
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<{ variations: Array<Omit<ThumbnailVariation, 'id'>> }>(
      res.text
    );
    return (data.variations || []).slice(0, 3).map((v) => ({
      ...v,
      id: crypto.randomUUID(),
    }));
  },

  async generateSeo(
    briefing: Briefing,
    script: ScriptVersion | undefined,
    settings: StudioSettings
  ): Promise<SeoMetadata> {
    const prompt = `Otimize os metadados de SEO para YouTube Brasil do canal Chakra Puro BR.
REGRA OBRIGATÓRIA: A descrição DEVE conter exatamente o link: ${MANDATORY_SUBSCRIBE_URL}
Anime: ${briefing.identification.anime}
Tema: ${briefing.identification.mainTheme}
Palavra-chave principal: ${briefing.seo.primaryKeyword}
Palavras-chave secundárias: ${briefing.seo.secondaryKeywords}
Título desejado pelo usuário: ${briefing.seo.desiredTitle}
Spoilers: ${briefing.seo.spoilers}
Trecho do roteiro: ${script?.fullText?.slice(0, 1000) || ''}

Retorne JSON válido:
{
  "titleOptions": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
  "selectedTitle": "Melhor título escolhido",
  "description": "Descrição completa otimizada contendo ${MANDATORY_SUBSCRIBE_URL}",
  "hashtags": ["#anime", "#chakrapurobr"],
  "tags": ["tag 1", "tag 2"],
  "keywords": ["kw 1", "kw 2"],
  "pinnedComment": "Comentário fixado para gerar engajamento",
  "cta": "CTA final",
  "spoilerNotice": "Aviso claro sobre spoilers"
}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
      responseMimeType: 'application/json',
    });

    const data = parseJsonSafe<SeoMetadata>(res.text);
    if (!data.description.includes(MANDATORY_SUBSCRIBE_URL)) {
      data.description = `${data.description}\n\nInscreva-se no Chakra Puro BR: ${MANDATORY_SUBSCRIBE_URL}`;
    }
    return data;
  },

  async analyzePerformance(
    records: PerformanceRecord[],
    settings: StudioSettings
  ): Promise<string> {
    const prompt = `Analise o histórico real de desempenho abaixo do YouTube Studio para o canal Chakra Puro BR.
REGRA CRÍTICA: ${
      records.length <= 1
        ? 'Há apenas 1 publicação registrada. Informe explicitamente que NÃO é possível tirar conclusões definitivas com base em uma única publicação, apresentando apenas hipóteses iniciais de observação.'
        : 'Compare tendências entre as publicações e recomende melhorias práticas para os próximos vídeos (gancho, retenção, título/thumbnail, ritmo).'
    }
DADOS REGISTRADOS: ${JSON.stringify(records)}`;

    const res = await apiClient.generateText({
      prompt,
      systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
      model: settings.geminiModel,
    });
    return res.text;
  },
};
