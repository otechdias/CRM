"use client";

// ============================================================
// PALETA CENTRALIZADA DO DASHBOARD
// ============================================================

export const CORES_GRAFICOS = [
  "#570df8", "#37cdbe", "#f87272", "#fbbd23",
  "#3abff8", "#a991f7", "#36d399", "#fb7185",
];

export const CORES_RESPONSAVEIS = [
  "#4F46E5", "#2563EB", "#06B6D4", "#10B981", "#84CC16",
  "#F59E0B", "#F97316", "#EF4444", "#EC4899", "#8B5CF6",
  "#A855F7", "#14B8A6", "#0EA5E9", "#6366F1", "#64748B",
];

export const CORES_MOTIVOS_PERDA: Record<string, string> = {
  "Preço": "#EF4444", "Sem orçamento": "#F97316", "Sem interesse": "#EAB308",
  "Projeto adiado": "#84CC16", "Escolheu concorrente": "#22C55E",
  "Já possui fornecedor": "#10B981", "Não respondeu": "#06B6D4",
  "Contato inválido": "#0EA5E9", "Empresa encerrou atividades": "#3B82F6",
  "Projeto cancelado": "#6366F1", "Prazo incompatível": "#8B5CF6",
  "Condições de pagamento": "#A855F7", "Não conseguimos contato": "#D946EF",
  "Outro": "#64748B",
};

export const CORES_STATUS_PAGAMENTO: Record<string, string> = {
  "Pendente": "#3ABFF8",
  "Atrasado": "#F87272",
  "Pago": "#36D399",
  "Cancelado": "#94A3B8",
};

export const CORES_STATUS_PROJETO: Record<string, string> = {
  "Briefing": "#3ABFF8",
  "Em andamento": "#FBBD23",
  "Em revisão": "#A991F7",
  "Aguardando cliente": "#F59E0B",
  "Pausado": "#94A3B8",
  "Entregue": "#36D399",
  "Cancelado": "#F87272",
};

export function corPorIndice(index: number) {
  return CORES_GRAFICOS[index % CORES_GRAFICOS.length];
}

// ============================================================
// TOOLTIP PADRÃO — usado por TODOS os gráficos do dashboard
// ============================================================

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  formatter?: (value: number | string, name?: string) => string;
}

export function CustomTooltip({ active, label, payload, formatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-base-300 bg-base-100 px-4 py-3 shadow-lg"
      style={{ minWidth: 160 }}
    >
      {label && (
        <div className="text-sm font-semibold text-base-content mb-1">
          {label}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-base-content/70">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>

            <span className="font-semibold text-base-content">
              {formatter ? formatter(item.value ?? "", item.name) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// NAVEGAÇÃO COM FILTRO — evita repetir window.location.href
// ============================================================

export function navigateWithFilter(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([chave, valor]) => {
    if (valor) search.set(chave, valor);
  });

  const query = search.toString();

  window.location.href = query ? `${base}?${query}` : base;
}