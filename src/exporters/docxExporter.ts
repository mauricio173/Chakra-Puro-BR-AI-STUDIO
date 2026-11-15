import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  TableOfContents,
  TextRun,
} from 'docx';
import { Project } from '../types/studio';
import { runLocalQualityAudit } from '../utils/validation';

function sanitizeFilename(input: string): string {
  return (input || 'SEM_DEFINICAO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function guideTitle(code: string, title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 140 },
    shading: { type: ShadingType.CLEAR, fill: 'FACC15' },
    children: [
      new TextRun({
        text: `  ${code} — ${title}  `,
        bold: true,
        font: 'Barlow',
        size: 30,
        color: '000000',
      }),
    ],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: 'Barlow',
        size: 24,
        color: '000000',
      }),
    ],
  });
}

function bodyLine(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        font: 'Barlow',
        size: 21,
        color: '000000',
      }),
      new TextRun({
        text: value || 'Não informado',
        font: 'Barlow',
        size: 21,
        color: '4B5563',
      }),
    ],
  });
}

function promptBlock(title: string, content: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          font: 'Barlow',
          size: 20,
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 140 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 18, color: 'FACC15' },
        top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      },
      shading: { type: ShadingType.CLEAR, fill: 'F9FAFB' },
      children: [
        new TextRun({
          text: content || '(Não gerado)',
          font: 'Barlow',
          size: 20,
          color: '1F2937',
        }),
      ],
    }),
  ];
}

export async function exportProjectToDocx(project: Project): Promise<string> {
  const anime = sanitizeFilename(project.briefing.identification.anime);
  const theme = sanitizeFilename(project.briefing.identification.mainTheme);
  const filename = `CHAKRA_PURO_BR_${anime}_${theme}_PRODUCAO.docx`;

  const activeScript = project.scriptVersions.find(
    (s) => s.id === project.activeScriptId
  );
  const qa = project.qualityReport ?? runLocalQualityAudit(project);

  const children: Array<Paragraph | TableOfContents> = [
    guideTitle('00', 'Capa e identificação'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 140 },
      children: [
        new TextRun({
          text: 'CHAKRA PURO BR — AI VIDEO STUDIO',
          bold: true,
          font: 'Barlow',
          size: 40,
          color: '000000',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: project.briefing.identification.projectName,
          bold: true,
          font: 'Barlow',
          size: 30,
          color: '4B5563',
        }),
      ],
    }),
    bodyLine('Anime', project.briefing.identification.anime),
    bodyLine('Tema Principal', project.briefing.identification.mainTheme),
    bodyLine('Personagem Principal', project.briefing.identification.mainCharacter),
    bodyLine(
      'Formato / Duração',
      `${project.briefing.duration.videoType} (${project.briefing.duration.desiredDurationSeconds}s) — ${project.briefing.duration.aspectRatio}`
    ),
    bodyLine('Criado em', new Date(project.createdAt).toLocaleString('pt-BR')),
    new Paragraph({ children: [new PageBreak()] }),

    subHeading('SUMÁRIO'),
    new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('01', 'Pesquisa e planejamento'),
    bodyLine('Objetivo do Vídeo', project.briefing.identification.videoObjective),
    bodyLine('Público-alvo', project.briefing.identification.targetAudience),
    bodyLine('Episódio / Saga', project.briefing.identification.episodeOrSaga),
    bodyLine('Referência / Acontecimento', project.briefing.identification.referenceOrEvent),
    ...project.trendSearches.flatMap((t) => [
      subHeading(
        `Pesquisa: ${t.query} (${new Date(t.consultedAt).toLocaleDateString('pt-BR')})`
      ),
      ...t.items.map((item) =>
        bodyLine(
          `${item.anime} — ${item.topic} [${item.classification}]`,
          `${item.observedTrend} | Abordagem: ${item.suggestedApproach}`
        )
      ),
    ]),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('02', 'Direção criativa'),
    bodyLine('Estilo Visual', project.briefing.visualIdentity.animeStyle),
    bodyLine('Referência Estética', project.briefing.visualIdentity.aestheticRef),
    bodyLine('Paleta de Cores', project.briefing.visualIdentity.colorPalette),
    bodyLine('Iluminação', project.briefing.visualIdentity.lighting),
    bodyLine('Estilo Emocional da Narração', project.briefing.narrationStyle.emotionalStyle),
    bodyLine(
      'Regras Permanentes YouTube Create',
      'Trilha Sonora DESATIVADA | Música DESATIVADA | Máximo 900 caracteres por prompt'
    ),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('03', 'Roteiro'),
    bodyLine('Formato Recomendado', activeScript?.recommendedFormat || 'Não gerado'),
    bodyLine('Justificativa', activeScript?.justification || ''),
    bodyLine('Aviso de Spoilers', activeScript?.spoilerAlert || project.briefing.seo.spoilers),
    ...promptBlock('ROTEIRO COMPLETO (3ª PESSOA PT-BR)', activeScript?.fullText || ''),
    ...(activeScript?.factVsTheoryNotes?.length
      ? [
          subHeading('Notas de Cânone vs Teoria'),
          ...activeScript.factVsTheoryNotes.map((n, i) => bodyLine(`Nota ${i + 1}`, n)),
        ]
      : []),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('04', 'Prompts das imagens Gemini'),
    ...project.scenes.flatMap((scene) => {
      const imgs = project.imagePromptsByScene[scene.id];
      return [
        subHeading(`Cena ${scene.number} (${scene.startTime} – ${scene.endTime} · ${scene.durationSec}s)`),
        bodyLine('Objetivo / Ação', `${scene.narrativeObjective} — ${scene.action}`),
        ...promptBlock(`Cena ${scene.number} — Prompt Imagem 01`, imgs?.[0]?.fullPrompt || ''),
        ...promptBlock(`Cena ${scene.number} — Prompt Imagem 02`, imgs?.[1]?.fullPrompt || ''),
      ];
    }),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('05', 'Prompts dos vídeos YouTube Create'),
    ...project.scenes.flatMap((scene) => {
      const anim = project.animationPromptsByScene[scene.id];
      return [
        subHeading(`Cena ${scene.number} (${anim?.charCount ?? 0}/900 caracteres)`),
        ...promptBlock(`Prompt Animação Cena ${scene.number}`, anim?.prompt || ''),
      ];
    }),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('06', 'Narração ElevenLabs'),
    ...project.narrationSegments.flatMap((seg) => [
      subHeading(`Cena ${seg.sceneNumber} (${seg.estimatedSeconds}s · ${seg.emotionalIntent})`),
      bodyLine('Pausas / Pronúncia / Ênfase', `${seg.pauses} | ${seg.pronunciation} | ${seg.emphasis}`),
      ...promptBlock(`Texto Narração Cena ${seg.sceneNumber}`, seg.text),
    ]),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('07', 'Thumbnail'),
    ...project.thumbnailVariations.flatMap((t, idx) => [
      subHeading(`Variação ${idx + 1}: ${t.title}`),
      bodyLine('Texto Principal / Secundário', `${t.mainText} | ${t.secondaryText}`),
      bodyLine('Composição', t.composition),
      ...promptBlock('Prompt Gemini Thumbnail (16:9 Barlow Branco/Amarelo)', t.geminiPrompt),
    ]),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('08', 'SEO e metadados'),
    bodyLine('Título Selecionado', project.seo?.selectedTitle || ''),
    bodyLine('Cinco Opções de Título', project.seo?.titleOptions.join(' | ') || ''),
    ...promptBlock('Descrição Otimizada', project.seo?.description || ''),
    bodyLine('Hashtags', project.seo?.hashtags.join(' ') || ''),
    bodyLine('Tags', project.seo?.tags.join(', ') || ''),
    bodyLine('Palavras-chave', project.seo?.keywords.join(', ') || ''),
    bodyLine('Comentário Fixado', project.seo?.pinnedComment || ''),
    new Paragraph({ children: [new PageBreak()] }),

    guideTitle('09', 'Detalhes de publicação'),
    bodyLine(
      'Data/Horário Planejado',
      project.briefing.seo.publishDateTime || project.briefing.identification.plannedDate
    ),
    bodyLine('CTA', project.seo?.cta || project.briefing.seo.cta),
    bodyLine('Aviso de Spoilers', project.seo?.spoilerNotice || project.briefing.seo.spoilers),

    guideTitle('10', 'Direitos autorais e monetização'),
    bodyLine('Conteúdo para crianças', project.briefing.copyright.madeForKids),
    bodyLine('Declaração de conteúdo sintético', project.briefing.copyright.syntheticContentDeclaration),
    bodyLine('Personagens protegidos', project.briefing.copyright.protectedCharacters),
    bodyLine('Observação Legal', qa.disclaimer),

    guideTitle('11', 'Controle de produção'),
    bodyLine('Status Geral da Auditoria', qa.overallStatus),
    ...qa.items.map((item) => bodyLine(`[${item.status}] ${item.label}`, item.details)),

    guideTitle('12', 'Análise de desempenho'),
    bodyLine(
      'Acompanhamento pós-publicação',
      'Registre visualizações, retenção, RPM e métricas do YouTube Studio no módulo Análise de Desempenho do Chakra Puro BR Studio.'
    ),
  ];

  const doc = new Document({
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: 'Barlow', size: 22, color: '000000' },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `CHAKRA PURO BR — ${project.briefing.identification.projectName}`,
                    font: 'Barlow',
                    size: 16,
                    color: '6B7280',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', font: 'Barlow', size: 16, color: '6B7280' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Barlow', size: 16, color: '6B7280' }),
                  new TextRun({ text: ' de ', font: 'Barlow', size: 16, color: '6B7280' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Barlow', size: 16, color: '6B7280' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return filename;
}
