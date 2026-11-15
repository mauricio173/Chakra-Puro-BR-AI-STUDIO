import ExcelJS from 'exceljs';
import { Briefing, EMOTIONAL_STYLES, NARRATIVE_FORMATS } from '../types/studio';
import { evaluateBriefing } from '../utils/validation';

const COLORS = {
  HEADER_BG: 'FF111827',
  HEADER_FG: 'FFFFFFFF',
  USER_INPUT: 'FFFEF08A',
  AUTO_GRAY: 'FFE5E7EB',
  VALID_GREEN: 'FFDCFCE7',
  PENDING_RED: 'FFFEE2E2',
};

function styleRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  field: string,
  value: string | number | boolean,
  guide: string,
  required: boolean,
  dropdownFormula?: string
) {
  const row = ws.getRow(rowIdx);
  row.getCell(1).value = field;
  row.getCell(1).font = { bold: true, name: 'Barlow', size: 11 };
  row.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.AUTO_GRAY },
  };

  const valCell = row.getCell(2);
  valCell.value = value;
  valCell.font = { name: 'Barlow', size: 11 };
  valCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.USER_INPUT },
  };
  if (dropdownFormula) {
    valCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [dropdownFormula],
    };
  }

  row.getCell(3).value = required ? 'Obrigatório' : 'Opcional';
  row.getCell(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.AUTO_GRAY },
  };

  const statusCell = row.getCell(4);
  statusCell.value = { formula: `IF(LEN(TRIM(B${rowIdx}))>0,"Validado","Pendente")` };
  statusCell.font = { bold: true, name: 'Barlow', size: 11 };

  row.getCell(5).value = guide;
  row.getCell(5).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.AUTO_GRAY },
  };
}

function setupSheetHeader(ws: ExcelJS.Worksheet, title: string) {
  ws.columns = [
    { header: 'Campo', key: 'field', width: 32 },
    { header: 'Preenchimento do Usuário', key: 'value', width: 48 },
    { header: 'Tipo', key: 'req', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Orientações / Regra', key: 'guide', width: 48 },
  ];
  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: COLORS.HEADER_FG },
      name: 'Barlow',
      size: 11,
    };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.getCell('F1').value = title;
}

export async function exportBriefingToXlsx(briefing: Briefing): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chakra Puro BR — AI Video Studio';
  wb.created = new Date();

  const evalSummary = evaluateBriefing(briefing);

  const ws01 = wb.addWorksheet('01_INICIO_E_INSTRUCOES');
  setupSheetHeader(ws01, 'INÍCIO E INSTRUÇÕES');
  const instructions = [
    ['Cor Amarela', 'Campos editáveis pelo usuário', 'Guia', 'Validado', 'Preencha as células amarelas nas abas 02 a 11.'],
    ['Cor Cinza', 'Orientações e cálculos automáticos', 'Guia', 'Validado', 'Não remova as fórmulas da coluna Status.'],
    ['Cor Verde', 'Validado automaticamente', 'Guia', 'Validado', 'Campo preenchido com sucesso.'],
    ['Cor Vermelha', 'Pendência detectada', 'Guia', 'Pendente', 'Campo aguardando preenchimento.'],
  ];
  instructions.forEach((inst, i) => {
    const r = ws01.getRow(i + 2);
    inst.forEach((v, col) => {
      r.getCell(col + 1).value = v;
    });
  });

  const ws02 = wb.addWorksheet('02_IDENTIFICACAO');
  setupSheetHeader(ws02, 'IDENTIFICAÇÃO DO VÍDEO');
  const idRows: Array<[string, string, string, boolean]> = [
    ['Nome do Projeto', briefing.identification.projectName, 'Nome identificador no estúdio', true],
    ['Anime', briefing.identification.anime, 'Obra principal', true],
    ['Tema Principal', briefing.identification.mainTheme, 'Assunto central do vídeo', true],
    ['Personagem Principal', briefing.identification.mainCharacter, 'Protagonista do vídeo', true],
    ['Personagens Secundários', briefing.identification.secondaryCharacters, 'Coadjuvantes relevantes', false],
    ['Episódio ou Saga', briefing.identification.episodeOrSaga, 'Referência de arco', false],
    ['Referência / Acontecimento', briefing.identification.referenceOrEvent, 'Cena ou capítulo gatilho', false],
    ['Objetivo do Vídeo', briefing.identification.videoObjective, 'Meta editorial', true],
    ['Público-alvo', briefing.identification.targetAudience, 'Audiência esperada', false],
    ['Data Prevista', briefing.identification.plannedDate, 'YYYY-MM-DD', false],
    ['Observações', briefing.identification.notes, 'Notas extras', false],
  ];
  idRows.forEach((r, idx) => styleRow(ws02, idx + 2, r[0], r[1], r[2], r[3]));

  const ws03 = wb.addWorksheet('03_DURACAO_E_DIVISAO');
  setupSheetHeader(ws03, 'DURAÇÃO E DIVISÃO');
  styleRow(ws03, 2, 'Tipo de Vídeo', briefing.duration.videoType, 'Short ou Vídeo Longo', true, '"Short,Vídeo Longo"');
  styleRow(ws03, 3, 'Duração Desejada (s)', briefing.duration.desiredDurationSeconds, 'Em segundos', true);
  styleRow(ws03, 4, 'Tempo Máximo por Cena (s)', briefing.duration.maxSceneSeconds, 'OBRIGATÓRIO <= 10s', true);
  styleRow(ws03, 5, 'Quantidade de Cenas', briefing.duration.sceneCount, 'Estimativa inicial', false);
  styleRow(ws03, 6, 'Proporção', briefing.duration.aspectRatio, '9:16 ou 16:9', true, '"9:16,16:9"');
  styleRow(ws03, 7, 'Ritmo Narrativo', briefing.duration.narrativePace, 'Cadência', false, '"Lento,Equilibrado,Dinâmico,Frenético"');
  styleRow(ws03, 8, 'Velocidade Narração', briefing.duration.narrationSpeed, 'Velocidade', false, '"Lenta,Normal,Rápida"');
  styleRow(ws03, 9, 'Divisão Automática', briefing.duration.autoSplit ? 'SIM' : 'NÃO', 'Checkbox SIM/NÃO', false, '"SIM,NÃO"');
  styleRow(ws03, 10, 'Observações', briefing.duration.notes, 'Notas de ritmo', false);

  const ws04 = wb.addWorksheet('04_FORMATOS_NARRATIVOS');
  setupSheetHeader(ws04, 'FORMATOS NARRATIVOS');
  const formatList = `"${Object.entries(NARRATIVE_FORMATS).map(([k, v]) => `${k} - ${v}`).join(',')}"`;
  styleRow(ws04, 2, 'Formato Principal', briefing.narrativeFormat.primaryFormat, 'Se vazio, a IA recomenda', false, formatList);
  styleRow(ws04, 3, 'Formato Secundário', briefing.narrativeFormat.secondaryFormat, 'Opcional', false, formatList);
  styleRow(ws04, 4, 'Combinação', briefing.narrativeFormat.formatCombination, 'Fusão narrativa', false);
  styleRow(ws04, 5, 'Tipo de Gancho', briefing.narrativeFormat.hookType, 'Primeiros 3s', false);
  styleRow(ws04, 6, 'Desenvolvimento', briefing.narrativeFormat.development, 'Escalada', false);
  styleRow(ws04, 7, 'Revelação', briefing.narrativeFormat.revelation, 'Clímax', false);
  styleRow(ws04, 8, 'Encerramento', briefing.narrativeFormat.ending, 'Recompensa', false);
  styleRow(ws04, 9, 'CTA', briefing.narrativeFormat.cta, 'Chamada para ação', false);
  styleRow(ws04, 10, 'Intensidade', briefing.narrativeFormat.narrativeIntensity, 'Moderada/Alta/Extrema', false, '"Moderada,Alta,Extrema"');

  const ws05 = wb.addWorksheet('05_ESTILO_NARRACAO');
  setupSheetHeader(ws05, 'ESTILO DE NARRAÇÃO');
  styleRow(ws05, 2, 'Tom de Voz', briefing.narrationStyle.voiceTone, 'Timbre/postura', false);
  styleRow(ws05, 3, 'Estilo Emocional', briefing.narrationStyle.emotionalStyle, '9 estilos oficiais', true, `"${EMOTIONAL_STYLES.join(',')}"`);
  styleRow(ws05, 4, 'Intensidade', briefing.narrationStyle.intensity, 'Suave/Média/Forte/Épica', false, '"Suave,Média,Forte,Épica"');
  styleRow(ws05, 5, 'Velocidade', briefing.narrationStyle.speed, 'Fator de fala', false);
  styleRow(ws05, 6, 'Gênero da Voz', briefing.narrationStyle.voiceGender, 'Masculina/Feminina', false, '"Masculina,Feminina"');
  styleRow(ws05, 7, 'Referência ElevenLabs', briefing.narrationStyle.elevenLabsVoiceRef, 'Voice ID ou nome', false);
  styleRow(ws05, 8, 'Pronúncia', briefing.narrationStyle.pronunciationNotes, 'Termos em japonês', false);
  styleRow(ws05, 9, 'Pausas', briefing.narrationStyle.pauseNotes, 'Respirações', false);
  styleRow(ws05, 10, 'Interpretação', briefing.narrationStyle.interpretationPrefs, 'Sempre 3ª pessoa', false);

  const ws06 = wb.addWorksheet('06_IDENTIDADE_VISUAL');
  setupSheetHeader(ws06, 'IDENTIDADE VISUAL E IMAGENS');
  Object.entries(briefing.visualIdentity).forEach(([k, v], i) => {
    styleRow(ws06, i + 2, k, String(v), 'Consistência visual Gemini', k === 'animeStyle');
  });

  const ws07 = wb.addWorksheet('07_ANIMACAO_E_SFX');
  setupSheetHeader(ws07, 'ANIMAÇÃO E EFEITOS SONOROS');
  styleRow(ws07, 2, 'Movimento Personagens', briefing.animationSfx.characterMovement, 'Ação física', false);
  styleRow(ws07, 3, 'Movimento Câmera', briefing.animationSfx.cameraMovement, 'Enquadramento dinâmico', false);
  styleRow(ws07, 4, 'Intensidade', briefing.animationSfx.intensity, 'Sutil/Moderada/Intensa', false, '"Sutil,Moderada,Intensa"');
  styleRow(ws07, 5, 'Movimento Ambiente', briefing.animationSfx.environmentMovement, 'Partículas/vento', false);
  styleRow(ws07, 6, 'Efeitos Visuais', briefing.animationSfx.visualEffects, 'VFX', false);
  styleRow(ws07, 7, 'Efeitos Sonoros', briefing.animationSfx.soundEffects, 'SFX secos', false);
  styleRow(ws07, 8, 'Trilha Sonora', 'DESATIVADA', 'Regra permanente obrigatória', true);
  styleRow(ws07, 9, 'Música', 'DESATIVADA', 'Regra permanente obrigatória', true);
  styleRow(ws07, 10, 'Limite YouTube Create', 900, 'Máximo 900 caracteres', true);

  const ws08 = wb.addWorksheet('08_THUMBNAIL');
  setupSheetHeader(ws08, 'THUMBNAIL');
  Object.entries(briefing.thumbnail).forEach(([k, v], i) => {
    styleRow(ws08, i + 2, k, String(v), 'Padrão Barlow branco/amarelo contorno preto', false);
  });

  const ws09 = wb.addWorksheet('09_SEO_E_PUBLICACAO');
  setupSheetHeader(ws09, 'SEO E PUBLICAÇÃO');
  Object.entries(briefing.seo).forEach(([k, v], i) => {
    styleRow(ws09, i + 2, k, String(v), 'Otimizado por IA', k === 'primaryKeyword');
  });

  const ws10 = wb.addWorksheet('10_DIREITOS_AUTORAIS');
  setupSheetHeader(ws10, 'DIREITOS AUTORAIS');
  Object.entries(briefing.copyright).forEach(([k, v], i) => {
    styleRow(ws10, i + 2, k, String(v), 'Não presumir respostas desconhecidas', false);
  });

  const ws11 = wb.addWorksheet('11_PREFERENCIAS');
  setupSheetHeader(ws11, 'PREFERÊNCIAS');
  Object.entries(briefing.preferences).forEach(([k, v], i) => {
    styleRow(ws11, i + 2, k, String(v), 'Campo livre criativo', false);
  });

  const ws12 = wb.addWorksheet('12_RESUMO_BRIEFING');
  setupSheetHeader(ws12, 'RESUMO CONSOLIDADO');
  ws12.getRow(2).values = [
    'Percentual de Preenchimento (%)',
    evalSummary.completionPercent,
    'Auto',
    evalSummary.status,
    'Calculado pelo estúdio',
  ];
  ws12.getRow(3).values = [
    'Campos Validados (Aba 02)',
    { formula: 'COUNTIF(\'02_IDENTIFICACAO\'!D2:D12,"Validado")' },
    'Fórmula',
    'Validado',
    'Contagem dinâmica',
  ];
  ws12.getRow(4).values = [
    'Pendências (Aba 02)',
    { formula: 'COUNTIF(\'02_IDENTIFICACAO\'!D2:D12,"Pendente")' },
    'Fórmula',
    'Pendente',
    'Contagem dinâmica',
  ];
  ws12.getRow(5).values = [
    'Inconsistências Detectadas',
    evalSummary.inconsistencies.join(' | ') || 'Nenhuma',
    'Auto',
    'Validado',
    'Validação automática',
  ];

  [ws02, ws03, ws04, ws05, ws06, ws07, ws08, ws09, ws10, ws11].forEach((ws) => {
    ws.addConditionalFormatting({
      ref: 'D2:D25',
      rules: [
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"Validado"'],
          priority: 1,
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: COLORS.VALID_GREEN },
            },
          },
        },
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"Pendente"'],
          priority: 2,
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: COLORS.PENDING_RED },
            },
          },
        },
      ],
    });
  });

  const filename = 'CHAKRA_PURO_BR_BRIEFING_E_PLANEJAMENTO.xlsx';
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return filename;
}
