import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  RefreshCw,
  Wrench,
  X,
} from 'lucide-react';
import {
  AiUsageLedger,
  DiagnosticError,
  ModuleId,
  StudioSettings,
} from '../types/studio';
import { IntegrationStatusResponse } from '../services/apiClient';

export const ActiveErrorBanner: React.FC<{
  error: DiagnosticError;
  onDismiss: (id: string) => void;
  onNavigate: (module: ModuleId) => void;
  onOpenDiagnostics: () => void;
}> = ({ error, onDismiss, onNavigate, onOpenDiagnostics }) => {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="bg-[#1B1116] border border-red-500/45 rounded-xl p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">{error.error}</h3>
              <span className="text-[11px] font-mono-num text-red-300">
                {error.code}
                {error.httpStatus ? ` (${error.httpStatus})` : ''} · {error.module}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              <strong className="text-gray-200">Causa:</strong> {error.cause}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDismiss(error.id)}
          className="p-1.5 rounded-lg border border-red-500/30 text-gray-300 hover:text-white cursor-pointer"
          aria-label="Fechar alerta de erro"
        >
          <X size={14} />
        </button>
      </div>

      <div className="bg-[#120B0F] border border-red-500/20 rounded-lg p-3.5 space-y-2">
        <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
          <Wrench size={13} /> Instruções para corrigir:
        </div>
        <ol className="list-decimal list-inside space-y-1 text-xs text-gray-200">
          {error.instructions.map((step, i) => (
            <li key={i} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap gap-2">
          {error.actionTarget && error.actionLabel && (
            <button
              onClick={() => {
                onNavigate(error.actionTarget!);
                onDismiss(error.id);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white cursor-pointer"
            >
              {error.actionLabel}
            </button>
          )}
          <button
            onClick={onOpenDiagnostics}
            className="px-3 py-1.5 rounded-lg border border-[#242434] bg-[#16161F] text-xs text-gray-200 hover:text-white cursor-pointer"
          >
            Ver Painel de Créditos & Erros
          </button>
        </div>

        {error.rawDetail && (
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 cursor-pointer"
          >
            {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Detalhes técnicos
          </button>
        )}
      </div>

      {showRaw && error.rawDetail && (
        <pre className="text-[11px] font-mono-num text-gray-400 bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {error.rawDetail}
        </pre>
      )}
    </div>
  );
};

export const AiDiagnosticsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  usage: AiUsageLedger;
  settings: StudioSettings;
  integrations: IntegrationStatusResponse | null;
  errors: DiagnosticError[];
  onResetUsage: () => void;
  onResolveError: (id: string) => void;
  onClearErrors: () => void;
  onNavigate: (m: ModuleId) => void;
}> = ({
  open,
  onClose,
  usage,
  settings,
  integrations,
  errors,
  onResetUsage,
  onResolveError,
  onClearErrors,
  onNavigate,
}) => {
  const [tab, setTab] = useState<'credits' | 'errors'>('credits');
  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTab(errors.some((e) => !e.resolved) ? 'errors' : 'credits');
    }
    prevOpenRef.current = open;
  }, [open, errors]);

  if (!open) return null;

  const unresolvedCount = errors.filter((e) => !e.resolved).length;
  const isSelectedTextPaid =
    settings.geminiModel === 'gemini-4-argon' ||
    settings.geminiModel === 'gemini-4-carbon';

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111118] border border-[#242434] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#242434] pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu size={20} className="text-[#A855F7]" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Créditos das IAs & Central de Erros
              </h2>
              <p className="text-xs text-gray-400">
                Consumo real registrado nesta estação, camada de faturamento dos modelos e guia
                de correção de falhas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#242434] text-gray-400 hover:text-white cursor-pointer"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 bg-[#0D0D14] p-1 rounded-lg border border-[#242434] w-fit">
          <button
            onClick={() => setTab('credits')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              tab === 'credits'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Créditos & Consumo IA
          </button>
          <button
            onClick={() => setTab('errors')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              tab === 'errors'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Erros e Correções ({unresolvedCount} ativo(s))
          </button>
        </div>

        {tab === 'credits' && (
          <div className="space-y-5">
            {/* Real recorded usage */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#16161F] border border-[#242434] rounded-lg p-3.5">
                <div className="text-[11px] text-gray-400">Requisições IA</div>
                <div className="font-mono-num text-2xl font-bold text-white mt-1">
                  {usage.totalRequests}
                </div>
              </div>
              <div className="bg-[#16161F] border border-[#242434] rounded-lg p-3.5">
                <div className="text-[11px] text-gray-400">Tokens de Entrada</div>
                <div className="font-mono-num text-2xl font-bold text-white mt-1">
                  {usage.promptTokens.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="bg-[#16161F] border border-[#242434] rounded-lg p-3.5">
                <div className="text-[11px] text-gray-400">Tokens de Saída</div>
                <div className="font-mono-num text-2xl font-bold text-white mt-1">
                  {usage.outputTokens.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="bg-[#16161F] border border-[#242434] rounded-lg p-3.5">
                <div className="text-[11px] text-gray-400">Total de Tokens</div>
                <div className="font-mono-num text-2xl font-bold text-[#C084FC] mt-1">
                  {usage.totalTokens.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Active models & billing tiers */}
            <div className="bg-[#16161F] border border-[#242434] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">
                  Situação de Créditos e Camadas dos Provedores
                </h3>
                <button
                  onClick={onResetUsage}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} /> Zerar contador local
                </button>
              </div>

              <div className="divide-y divide-[#242434] text-xs">
                <div className="py-2.5 flex flex-wrap justify-between gap-2">
                  <div>
                    <strong className="text-white">Google Gemini — Texto & Tendências</strong>
                    <div className="text-gray-400 mt-0.5">
                      Modelo ativo:{' '}
                      <span className="font-mono-num text-gray-200">
                        {settings.geminiModel}
                      </span>{' '}
                      ·{' '}
                      {isSelectedTextPaid
                        ? 'Requer conta com faturamento/créditos pagos'
                        : 'Compatível com camada gratuita (Free Tier) com limite por minuto'}
                    </div>
                  </div>
                  <span
                    className={
                      integrations?.gemini.configured ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {integrations?.gemini.configured ? 'Chave conectada' : 'Chave ausente'}
                  </span>
                </div>

                <div className="py-2.5 flex flex-wrap justify-between gap-2">
                  <div>
                    <strong className="text-white">Google Gemini — Geração Direta de Imagens</strong>
                    <div className="text-gray-400 mt-0.5">
                      Modelo ativo:{' '}
                      <span className="font-mono-num text-gray-200">
                        {settings.geminiImageModel}
                      </span>{' '}
                      · Exige chave com faturamento/créditos ativos (ou copie prompts gratuitamente)
                    </div>
                  </div>
                  <span className="font-mono-num text-gray-300">
                    {usage.imageGenerations} imagem(ns) gerada(s)
                  </span>
                </div>

                <div className="py-2.5 flex flex-wrap justify-between gap-2">
                  <div>
                    <strong className="text-white">ElevenLabs — Síntese de Voz</strong>
                    <div className="text-gray-400 mt-0.5">
                      {integrations?.elevenlabs.message ||
                        'Textos preparados localmente sem custo adicional.'}
                    </div>
                  </div>
                  <span
                    className={
                      integrations?.elevenlabs.configured
                        ? 'text-emerald-400'
                        : 'text-gray-400'
                    }
                  >
                    {integrations?.elevenlabs.configured ? 'API ativa' : 'Modo texto pronto'}
                  </span>
                </div>
              </div>

              <div className="bg-[#0D0D14] border border-[#242434] rounded-lg p-3 text-xs text-gray-300 space-y-1.5">
                <p>
                  <strong>Transparência sobre saldo:</strong> A API Gemini não expõe o saldo
                  financeiro restante diretamente pela chave. O painel acima contabiliza os{' '}
                  <strong>tokens e requisições reais</strong> consumidos por este estúdio.
                </p>
                <div className="flex flex-wrap gap-4 pt-1">
                  <a
                    href="https://aistudio.google.com/app/usage"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C084FC] hover:underline flex items-center gap-1"
                  >
                    Ver cota e uso no Google AI Studio <ExternalLink size={11} />
                  </a>
                  <a
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C084FC] hover:underline flex items-center gap-1"
                  >
                    Gerenciar créditos no Google Cloud Billing <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>

            {Object.keys(usage.byModel).length > 0 && (
              <div className="bg-[#16161F] border border-[#242434] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-300">Consumo por Modelo</h4>
                <div className="divide-y divide-[#242434] text-xs">
                  {Object.entries(usage.byModel).map(([modelName, stats]) => (
                    <div key={modelName} className="py-2 flex justify-between gap-4">
                      <div>
                        <span className="font-mono-num text-white">{modelName}</span>{' '}
                        <span className="text-gray-500">
                          ({stats.tier === 'paid' ? 'Modelo Pago' : 'Camada Gratuita/Padrão'})
                        </span>
                      </div>
                      <div className="font-mono-num text-gray-300">
                        {stats.requests} req · {stats.totalTokens.toLocaleString('pt-BR')} tokens
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'errors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {errors.length} registro(s) de diagnóstico nesta sessão
              </span>
              {errors.length > 0 && (
                <button
                  onClick={onClearErrors}
                  className="text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Limpar histórico
                </button>
              )}
            </div>

            {errors.length === 0 ? (
              <div className="bg-[#16161F] border border-[#242434] rounded-xl p-8 text-center space-y-2">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <p className="text-sm text-gray-200 font-medium">
                  Nenhum erro registrado na sessão atual.
                </p>
                <p className="text-xs text-gray-400">
                  Caso ocorra alguma falha de cota, chave, validação ou conexão, as instruções
                  passo a passo aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errors.map((err) => (
                  <div
                    key={err.id}
                    className={`border rounded-xl p-4 space-y-2.5 ${
                      err.resolved
                        ? 'bg-[#13131B] border-[#242434] opacity-75'
                        : 'bg-[#191116] border-red-500/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong className="text-sm text-white">{err.error}</strong>
                        <div className="text-[11px] font-mono-num text-gray-400">
                          {err.code} · {err.module} ·{' '}
                          {new Date(err.timestamp).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!err.resolved && (
                          <button
                            onClick={() => onResolveError(err.id)}
                            className="px-2.5 py-1 rounded border border-[#242434] text-xs text-gray-200 hover:text-white cursor-pointer"
                          >
                            Marcar como resolvido
                          </button>
                        )}
                        {err.actionTarget && err.actionLabel && (
                          <button
                            onClick={() => {
                              onNavigate(err.actionTarget!);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded bg-[#8B5CF6] text-xs font-medium text-white cursor-pointer"
                          >
                            {err.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-300">
                      <strong>Causa:</strong> {err.cause}
                    </p>
                    <div className="bg-[#0D0D14] border border-[#242434] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-amber-300 mb-1">
                        Como consertar:
                      </div>
                      <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-200">
                        {err.instructions.map((ins, idx) => (
                          <li key={idx}>{ins}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
