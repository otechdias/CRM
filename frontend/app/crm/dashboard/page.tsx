"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import * as XLSX from "xlsx";


// ============================================================
// TIPOS
// ============================================================

interface FunilItem {
  chave: string;
  etapa: string;
  quantidade: number;
}

interface ProximaAcao {
  origem: string;
  id: number;
  empresa: string | null;
  responsavel: string | null;
  acao: string | null;
  data: string | null;
  horario: string | null;
  prioridade: string | null;
  status: string | null;
}

interface GraficoOrigem {
  origem: string;
  quantidade: number;
}

interface GraficoResponsavel {
  responsavel: string;
  quantidade: number;
}

interface GraficoRamo {
  ramo: string;
  quantidade: number;
}

interface GraficoPerda {
  motivo: string;
  quantidade: number;
}

interface GraficoEvolucao {
  data: string;
  leads: number;
  convertidos: number;
  perdidos: number;
}

interface GraficoProjeto {
  status: string;
  quantidade: number;
}

interface GraficoPagamento {
  status: string;
  quantidade: number;
}

interface DashboardData {
  clientes: {
    ativos: number;
  };

  funil: FunilItem[];

  indicadores: {
    taxa_conversao: number;
    taxa_perda: number;
    ticket_potencial_medio: number;
    valor_potencial: number;
  };

  leads: {
    andamento: number;
    convertidos: number;
    novos: number;
    perdidos: number;
    total: number;
  };

  pagamentos: {
    pendentes: number;
    receita: number;
    valor_pendente: number;
  };

  planos: {
    ativos: number;
    mrr: number;
  };

  projetos: {
    andamento: number;
    total: number;
  };

  proximas_acoes: ProximaAcao[];

  filtros: {
    responsaveis: string[];
    origens: string[];
    ramos: string[];
    status: string[];
    etapas: string[];
  };

  filtros_aplicados: {
    periodo: string;
    busca: string;
    responsavel: string;
    origem: string;
    ramo: string;
    status: string;
    etapa: string;
    data_inicio: string;
    data_fim: string;
  };

  graficos: {
    leads_por_origem: GraficoOrigem[];
    leads_por_responsavel: GraficoResponsavel[];
    leads_por_ramo: GraficoRamo[];
    motivos_de_perda: GraficoPerda[];
    evolucao_leads: GraficoEvolucao[];
    projetos_por_status: GraficoProjeto[];
    pagamentos_por_status: GraficoPagamento[];
  };
}


// ============================================================
// CORES DOS GRÁFICOS
// ============================================================

const CORES_GRAFICOS = [
  "#570df8",
  "#37cdbe",
  "#f87272",
  "#fbbd23",
  "#3abff8",
  "#a991f7",
  "#36d399",
  "#fb7185",
];


// ============================================================
// COMPONENTE
// ============================================================

export default function DashboardPage() {

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  // Filtros
  const [periodo, setPeriodo] =
    useState("todos");

  const [busca, setBusca] =
    useState("");

  const [responsavel, setResponsavel] =
    useState("");

  const [origem, setOrigem] =
    useState("");

  const [ramo, setRamo] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [etapa, setEtapa] =
    useState("");

  const [dataInicio, setDataInicio] =
    useState("");

  const [dataFim, setDataFim] =
    useState("");


  // ==========================================================
  // BUSCAR DASHBOARD
  // ==========================================================

  const carregarDashboard = async () => {

    try {

      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();

      if (periodo) {
        params.set("periodo", periodo);
      }

      if (busca.trim()) {
        params.set("busca", busca.trim());
      }

      if (responsavel) {
        params.set("responsavel", responsavel);
      }

      if (origem) {
        params.set("origem", origem);
      }

      if (ramo) {
        params.set("ramo", ramo);
      }

      if (status) {
        params.set("status", status);
      }

      if (etapa) {
        params.set("etapa", etapa);
      }

      if (dataInicio) {
        params.set("data_inicio", dataInicio);
      }

      if (dataFim) {
        params.set("data_fim", dataFim);
      }

      const query =
        params.toString();

      const url =
        query
          ? `/api/dashboard/?${query}`
          : "/api/dashboard/";

      const response =
        await axios.get(url);

      setDashboard(response.data);

    } catch (error) {

      console.error(
        "Erro ao carregar dashboard:",
        error
      );

      setErro(
        "Não foi possível carregar os dados do Dashboard."
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // PRIMEIRO CARREGAMENTO
  // ==========================================================

  useEffect(() => {

    carregarDashboard();

  }, []);


  // ==========================================================
  // LIMPAR FILTROS
  // ==========================================================

  const limparFiltros = () => {

    setPeriodo("todos");
    setBusca("");
    setResponsavel("");
    setOrigem("");
    setRamo("");
    setStatus("");
    setEtapa("");
    setDataInicio("");
    setDataFim("");

    setTimeout(() => {

      carregarDashboard();

    }, 0);
  };


  // ==========================================================
  // FORMATADORES
  // ==========================================================

  const formatarMoeda = (
    valor: number | null | undefined
  ) => {

    return new Intl.NumberFormat(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    ).format(valor || 0);

  };


  const formatarData = (
    data: string | null
  ) => {

    if (!data) {
      return "-";
    }

    const partes =
      data.split("-");

    if (partes.length !== 3) {
      return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };


  const formatarDataCurta = (
    data: string
  ) => {

    const partes =
      data.split("-");

    if (partes.length !== 3) {
      return data;
    }

    return `${partes[2]}/${partes[1]}`;
  };


  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const navegar = (
    caminho: string
  ) => {

    window.location.href =
      caminho;

  };


  // ==========================================================
  // DADOS DOS GRÁFICOS
  // ==========================================================

  const dadosEvolucao = useMemo(() => {

    if (!dashboard) {
      return [];
    }

    return dashboard.graficos.evolucao_leads.map(
      item => ({
        ...item,
        dataFormatada:
          formatarDataCurta(item.data),
      })
    );

  }, [dashboard]);


  const dadosFunil = useMemo(() => {

    if (!dashboard) {
      return [];
    }

    return dashboard.funil;

  }, [dashboard]);


  // ==========================================================
  // EXPORTAÇÃO CSV
  // ==========================================================

  const exportarCSV = () => {

    if (!dashboard) {
      return;
    }

    const linhas = [
      [
        "Indicador",
        "Valor",
      ],

      [
        "Total de Leads",
        dashboard.leads.total,
      ],

      [
        "Leads Novos",
        dashboard.leads.novos,
      ],

      [
        "Leads em Andamento",
        dashboard.leads.andamento,
      ],

      [
        "Leads Convertidos",
        dashboard.leads.convertidos,
      ],

      [
        "Leads Perdidos",
        dashboard.leads.perdidos,
      ],

      [
        "Clientes Ativos",
        dashboard.clientes.ativos,
      ],

      [
        "Projetos em Andamento",
        dashboard.projetos.andamento,
      ],

      [
        "Projetos Totais",
        dashboard.projetos.total,
      ],

      [
        "Pagamentos Pendentes",
        dashboard.pagamentos.pendentes,
      ],

      [
        "Valor Pendente",
        dashboard.pagamentos.valor_pendente,
      ],

      [
        "Receita",
        dashboard.pagamentos.receita,
      ],

      [
        "Planos Ativos",
        dashboard.planos.ativos,
      ],

      [
        "MRR",
        dashboard.planos.mrr,
      ],

      [
        "Taxa de Conversão",
        dashboard.indicadores.taxa_conversao,
      ],

      [
        "Taxa de Perda",
        dashboard.indicadores.taxa_perda,
      ],

      [
        "Valor Potencial",
        dashboard.indicadores.valor_potencial,
      ],

      [
        "Ticket Potencial Médio",
        dashboard.indicadores.ticket_potencial_medio,
      ],
    ];


    const csv =
      linhas
        .map(
          linha =>
            linha
              .map(valor => {

                const texto =
                  String(valor ?? "");

                return `"${texto.replace(
                  /"/g,
                  '""'
                )}"`;

              })
              .join(";")
        )
        .join("\n");


    const blob =
      new Blob(
        ["\ufeff" + csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );


    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `dashboard-crm-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);

  };


  // ==========================================================
  // EXPORTAÇÃO XLSX
  // ==========================================================

  const exportarXLSX = () => {

    if (!dashboard) {
      return;
    }

    const workbook =
      XLSX.utils.book_new();


    // --------------------------------------------------------
    // RESUMO
    // --------------------------------------------------------

    const resumo = [
      {
        Indicador: "Total de Leads",
        Valor: dashboard.leads.total,
      },

      {
        Indicador: "Leads Novos",
        Valor: dashboard.leads.novos,
      },

      {
        Indicador: "Leads em Andamento",
        Valor: dashboard.leads.andamento,
      },

      {
        Indicador: "Leads Convertidos",
        Valor: dashboard.leads.convertidos,
      },

      {
        Indicador: "Leads Perdidos",
        Valor: dashboard.leads.perdidos,
      },

      {
        Indicador: "Clientes Ativos",
        Valor: dashboard.clientes.ativos,
      },

      {
        Indicador: "Projetos em Andamento",
        Valor: dashboard.projetos.andamento,
      },

      {
        Indicador: "Projetos Totais",
        Valor: dashboard.projetos.total,
      },

      {
        Indicador: "Pagamentos Pendentes",
        Valor: dashboard.pagamentos.pendentes,
      },

      {
        Indicador: "Valor Pendente",
        Valor: dashboard.pagamentos.valor_pendente,
      },

      {
        Indicador: "Receita",
        Valor: dashboard.pagamentos.receita,
      },

      {
        Indicador: "Planos Ativos",
        Valor: dashboard.planos.ativos,
      },

      {
        Indicador: "MRR",
        Valor: dashboard.planos.mrr,
      },

      {
        Indicador: "Taxa de Conversão",
        Valor: dashboard.indicadores.taxa_conversao,
      },

      {
        Indicador: "Taxa de Perda",
        Valor: dashboard.indicadores.taxa_perda,
      },

      {
        Indicador: "Valor Potencial",
        Valor: dashboard.indicadores.valor_potencial,
      },

      {
        Indicador: "Ticket Potencial Médio",
        Valor: dashboard.indicadores.ticket_potencial_medio,
      },
    ];


    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(resumo),
      "Resumo"
    );


    // --------------------------------------------------------
    // FUNIL
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.funil.map(item => ({
          Etapa: item.etapa,
          Quantidade: item.quantidade,
        }))
      ),
      "Funil"
    );


    // --------------------------------------------------------
    // ORIGENS
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.leads_por_origem.map(
          item => ({
            Origem: item.origem,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Origens"
    );


    // --------------------------------------------------------
    // RESPONSÁVEIS
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.leads_por_responsavel.map(
          item => ({
            Responsavel: item.responsavel,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Responsáveis"
    );


    // --------------------------------------------------------
    // RAMOS
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.leads_por_ramo.map(
          item => ({
            Ramo: item.ramo,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Ramos"
    );


    // --------------------------------------------------------
    // MOTIVOS DE PERDA
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.motivos_de_perda.map(
          item => ({
            Motivo: item.motivo,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Motivos de Perda"
    );


    // --------------------------------------------------------
    // EVOLUÇÃO
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.evolucao_leads.map(
          item => ({
            Data: item.data,
            Leads: item.leads,
            Convertidos: item.convertidos,
            Perdidos: item.perdidos,
          })
        )
      ),
      "Evolução"
    );


    // --------------------------------------------------------
    // PROJETOS
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.projetos_por_status.map(
          item => ({
            Status: item.status,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Projetos"
    );


    // --------------------------------------------------------
    // PAGAMENTOS
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.graficos.pagamentos_por_status.map(
          item => ({
            Status: item.status,
            Quantidade: item.quantidade,
          })
        )
      ),
      "Pagamentos"
    );


    // --------------------------------------------------------
    // PRÓXIMAS AÇÕES
    // --------------------------------------------------------

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        dashboard.proximas_acoes.map(
          item => ({
            Data: item.data,
            Horário: item.horario,
            Empresa: item.empresa,
            Ação: item.acao,
            Responsável: item.responsavel,
            Prioridade: item.prioridade,
            Status: item.status,
          })
        )
      ),
      "Próximas Ações"
    );


    // --------------------------------------------------------
    // DOWNLOAD
    // --------------------------------------------------------

    XLSX.writeFile(
      workbook,
      `dashboard-crm-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div className="p-6">

        <div className="flex items-center justify-center min-h-[400px]">

          <span className="loading loading-spinner loading-lg"></span>

        </div>

      </div>
    );

  }


  // ==========================================================
  // ERRO
  // ==========================================================

  if (erro) {

    return (
      <div className="p-6">

        <div className="alert alert-error">

          <span>{erro}</span>

          <button
            type="button"
            className="btn btn-sm"
            onClick={carregarDashboard}
          >
            Tentar novamente
          </button>

        </div>

      </div>
    );

  }


  if (!dashboard) {
    return null;
  }


  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (

    <div className="p-6 space-y-6">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Dashboard
          </h1>

          <p className="text-base-content/60 mt-1">
            Visão geral do seu CRM e desempenho comercial
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            className="btn btn-outline"
            onClick={carregarDashboard}
          >
            ↻ Atualizar
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={exportarCSV}
          >
            ↓ CSV
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={exportarXLSX}
          >
            ↓ Excel
          </button>

        </div>

      </div>


      {/* =====================================================
          FILTROS
      ====================================================== */}

      <div className="card bg-base-100 shadow-sm border border-base-300">

        <div className="card-body">

          <div className="flex flex-col gap-1">

            <h2 className="card-title">
              Filtros do Dashboard
            </h2>

            <p className="text-sm text-base-content/60">
              Todos os indicadores e gráficos abaixo respeitam os filtros selecionados.
            </p>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">

            {/* PESQUISA */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Pesquisar
                </span>

              </div>

              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Empresa, contato, telefone..."
                value={busca}
                onChange={event =>
                  setBusca(event.target.value)
                }
                onKeyDown={event => {

                  if (event.key === "Enter") {
                    carregarDashboard();
                  }

                }}
              />

            </label>


            {/* PERÍODO */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Período
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={periodo}
                onChange={event =>
                  setPeriodo(event.target.value)
                }
              >

                <option value="todos">
                  Todos os períodos
                </option>

                <option value="hoje">
                  Hoje
                </option>

                <option value="7">
                  Últimos 7 dias
                </option>

                <option value="30">
                  Últimos 30 dias
                </option>

                <option value="90">
                  Últimos 90 dias
                </option>

                <option value="ano">
                  Este ano
                </option>

              </select>

            </label>


            {/* RESPONSÁVEL */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Responsável
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={responsavel}
                onChange={event =>
                  setResponsavel(event.target.value)
                }
              >

                <option value="">
                  Todos
                </option>

                {dashboard.filtros.responsaveis.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            {/* ORIGEM */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Origem
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={origem}
                onChange={event =>
                  setOrigem(event.target.value)
                }
              >

                <option value="">
                  Todas
                </option>

                {dashboard.filtros.origens.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            {/* RAMO */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Ramo
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={ramo}
                onChange={event =>
                  setRamo(event.target.value)
                }
              >

                <option value="">
                  Todos
                </option>

                {dashboard.filtros.ramos.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            {/* STATUS */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Status do Lead
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={status}
                onChange={event =>
                  setStatus(event.target.value)
                }
              >

                <option value="">
                  Todos
                </option>

                {dashboard.filtros.status.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            {/* ETAPA */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Etapa Comercial
                </span>

              </div>

              <select
                className="select select-bordered w-full"
                value={etapa}
                onChange={event =>
                  setEtapa(event.target.value)
                }
              >

                <option value="">
                  Todas
                </option>

                {dashboard.filtros.etapas.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

            </label>


            {/* DATA INICIAL */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Data inicial
                </span>

              </div>

              <input
                type="date"
                className="input input-bordered w-full"
                value={dataInicio}
                onChange={event =>
                  setDataInicio(event.target.value)
                }
              />

            </label>


            {/* DATA FINAL */}

            <label className="form-control">

              <div className="label">

                <span className="label-text">
                  Data final
                </span>

              </div>

              <input
                type="date"
                className="input input-bordered w-full"
                value={dataFim}
                onChange={event =>
                  setDataFim(event.target.value)
                }
              />

            </label>

          </div>


          <div className="flex flex-wrap gap-2 mt-4">

            <button
              type="button"
              className="btn btn-primary"
              onClick={carregarDashboard}
            >
              Aplicar filtros
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          CARDS — LEADS
      ====================================================== */}

      <div>

        <div className="flex items-center justify-between mb-3">

          <div>

            <h2 className="text-xl font-bold">
              Comercial
            </h2>

            <p className="text-sm text-base-content/60">
              Visão dos leads conforme os filtros aplicados
            </p>

          </div>

        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* TOTAL */}

          <button
            type="button"
            className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
            onClick={() =>
              navegar("/crm/leads")
            }
          >

            <div className="card-body">

              <div className="text-sm text-base-content/60">
                Total de Leads
              </div>

              <div className="text-3xl font-bold">
                {dashboard.leads.total}
              </div>

              <div className="text-xs text-primary mt-1">
                Ver leads →
              </div>

            </div>

          </button>


          {/* NOVOS */}

          <button
            type="button"
            className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
            onClick={() =>
              navegar("/crm/leads?status=Novo")
            }
          >

            <div className="card-body">

              <div className="text-sm text-base-content/60">
                Leads Novos
              </div>

              <div className="text-3xl font-bold">
                {dashboard.leads.novos}
              </div>

              <div className="text-xs text-primary mt-1">
                Ver leads novos →
              </div>

            </div>

          </button>


          {/* ANDAMENTO */}

          <button
            type="button"
            className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
            onClick={() =>
              navegar("/crm/leads?status=Em%20andamento")
            }
          >

            <div className="card-body">

              <div className="text-sm text-base-content/60">
                Em Andamento
              </div>

              <div className="text-3xl font-bold">
                {dashboard.leads.andamento}
              </div>

              <div className="text-xs text-primary mt-1">
                Ver leads →
              </div>

            </div>

          </button>


          {/* CONVERTIDOS */}

          <button
            type="button"
            className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
            onClick={() =>
              navegar("/crm/leads?status=Convertido")
            }
          >

            <div className="card-body">

              <div className="text-sm text-base-content/60">
                Convertidos
              </div>

              <div className="text-3xl font-bold">
                {dashboard.leads.convertidos}
              </div>

              <div className="text-xs text-primary mt-1">
                Ver convertidos →
              </div>

            </div>

          </button>


          {/* PERDIDOS */}

          <button
            type="button"
            className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
            onClick={() =>
              navegar("/crm/leads?status=Perdido")
            }
          >

            <div className="card-body">

              <div className="text-sm text-base-content/60">
                Perdidos
              </div>

              <div className="text-3xl font-bold">
                {dashboard.leads.perdidos}
              </div>

              <div className="text-xs text-primary mt-1">
                Ver perdidos →
              </div>

            </div>

          </button>

        </div>

      </div>


      {/* =====================================================
          CARDS — OPERAÇÃO
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CLIENTES ATIVOS */}

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/clientes?status=Ativo")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Clientes Ativos
            </div>

            <div className="text-3xl font-bold">
              {dashboard.clientes.ativos}
            </div>

            <div className="text-xs text-primary mt-1">
              Ver clientes ativos →
            </div>

          </div>

        </button>


        {/* PROJETOS */}

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/projetos?status=Em%20andamento")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Projetos em Andamento
            </div>

            <div className="text-3xl font-bold">
              {dashboard.projetos.andamento}
            </div>

            <div className="text-xs text-primary mt-1">
              Ver projetos →
            </div>

          </div>

        </button>


        {/* PAGAMENTOS */}

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/pagamentos?status=Pendente")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Pagamentos Pendentes
            </div>

            <div className="text-3xl font-bold">
              {dashboard.pagamentos.pendentes}
            </div>

            <div className="text-sm text-base-content/60">
              {formatarMoeda(
                dashboard.pagamentos.valor_pendente
              )}
            </div>

            <div className="text-xs text-primary mt-1">
              Ver pagamentos →
            </div>

          </div>

        </button>


        {/* RECEITA */}

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/pagamentos?status=Pago")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Receita
            </div>

            <div className="text-2xl font-bold">
              {formatarMoeda(
                dashboard.pagamentos.receita
              )}
            </div>

            <div className="text-sm text-base-content/60">
              Pagamentos recebidos
            </div>

            <div className="text-xs text-primary mt-1">
              Ver pagamentos →
            </div>

          </div>

        </button>

      </div>


      {/* =====================================================
          PLANOS RECORRENTES
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/planos?status=Ativo")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Planos Recorrentes
            </div>

            <div className="text-3xl font-bold">
              {dashboard.planos.ativos}
            </div>

            <div className="text-sm text-base-content/60">
              planos ativos
            </div>

            <div className="text-xs text-primary mt-1">
              Ver planos →
            </div>

          </div>

        </button>

      {/* =====================================================
          RECEITA RECORRENTE MENSAL MRR
      ====================================================== */}

        <button
          type="button"
          className="card bg-base-100 shadow-sm border border-base-300 text-left hover:shadow-md transition-shadow"
          onClick={() =>
            navegar("/crm/planos?status=Ativo")
          }
        >

          <div className="card-body">

            <div className="text-sm text-base-content/60">
              Receita Recorrente Mensal
            </div>

            <div className="text-2xl font-bold">
              {formatarMoeda(
                dashboard.planos.mrr
              )}
            </div>

            <div className="text-sm text-base-content/60">
              MRR
            </div>

            <div className="text-xs text-primary mt-1">
              Ver planos →
            </div>

          </div>

        </button>

      </div>


      {/* =====================================================
          FUNIL
      ====================================================== */}

      <div className="card bg-base-100 shadow-sm border border-base-300">

        <div className="card-body">

          <div>

            <h2 className="card-title">
              Funil Comercial
            </h2>

            <p className="text-sm text-base-content/60">
              Clique em uma etapa para visualizar os leads daquela etapa.
            </p>

          </div>


          <div className="space-y-4 mt-5">

            {dadosFunil.map(
              (item, index) => {

                const maior =
                  Math.max(
                    ...dadosFunil.map(
                      etapaItem =>
                        etapaItem.quantidade
                    ),
                    1
                  );

                const largura =
                  item.quantidade === 0
                    ? 0
                    : Math.max(
                        (
                          item.quantidade /
                          maior
                        ) * 100,
                        5
                      );

                return (

                  <button
                    type="button"
                    key={item.chave}
                    className="w-full text-left group"
                    onClick={() =>
                      navegar(
                        `/crm/leads?etapa=${encodeURIComponent(
                          item.etapa
                        )}`
                      )
                    }
                  >

                    <div className="flex items-center justify-between mb-1">

                      <span className="text-sm font-medium group-hover:text-primary transition-colors">

                        {index + 1}. {item.etapa}

                      </span>

                      <span className="text-sm font-bold">
                        {item.quantidade}
                      </span>

                    </div>


                    <div className="w-full bg-base-200 rounded-full h-3 overflow-hidden">

                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${largura}%`,
                        }}
                      />

                    </div>

                  </button>

                );

              }
            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          GRÁFICOS — EVOLUÇÃO + ORIGEM
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* EVOLUÇÃO */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Evolução dos Leads
            </h2>

            <p className="text-sm text-base-content/60">
              Entradas, conversões e perdas no período filtrado.
            </p>


            <div className="h-[320px] mt-4">

              {dadosEvolucao.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Não há dados suficientes para exibir este gráfico.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={dadosEvolucao}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                    />

                    <XAxis
                      dataKey="dataFormatada"
                      fontSize={12}
                    />

                    <YAxis
                      allowDecimals={false}
                      fontSize={12}
                    />

                    <Tooltip />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#570df8"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="convertidos"
                      name="Convertidos"
                      stroke="#36d399"
                      strokeWidth={2}
                    />

                    <Line
                      type="monotone"
                      dataKey="perdidos"
                      name="Perdidos"
                      stroke="#f87272"
                      strokeWidth={2}
                    />

                  </LineChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>


        {/* ORIGENS */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Leads por Origem
            </h2>

            <p className="text-sm text-base-content/60">
              De onde estão vindo os seus leads.
            </p>


            <div className="h-[320px] mt-4">

              {dashboard.graficos.leads_por_origem.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Não há dados para exibir.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={dashboard.graficos.leads_por_origem}
                      dataKey="quantidade"
                      nameKey="origem"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >

                      {dashboard.graficos.leads_por_origem.map(
                        (_, index) => (

                          <Cell
                            key={`origem-${index}`}
                            fill={
                              CORES_GRAFICOS[
                                index %
                                CORES_GRAFICOS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          GRÁFICOS — RESPONSÁVEL + RAMO
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* RESPONSÁVEL */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Leads por Responsável
            </h2>

            <p className="text-sm text-base-content/60">
              Distribuição dos leads entre os responsáveis.
            </p>


            <div className="h-[340px] mt-4">

              {dashboard.graficos.leads_por_responsavel.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Não há dados para exibir.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      dashboard.graficos.leads_por_responsavel
                    }
                    layout="vertical"
                    margin={{
                      left: 20,
                      right: 20,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                    />

                    <YAxis
                      type="category"
                      dataKey="responsavel"
                      width={100}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="quantidade"
                      name="Leads"
                      fill="#570df8"
                      radius={[0, 5, 5, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>


        {/* RAMOS */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Leads por Ramo
            </h2>

            <p className="text-sm text-base-content/60">
              Segmentos que mais aparecem na prospecção.
            </p>


            <div className="h-[340px] mt-4">

              {dashboard.graficos.leads_por_ramo.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Não há dados para exibir.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      dashboard.graficos.leads_por_ramo
                    }
                    margin={{
                      left: 10,
                      right: 10,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                    />

                    <XAxis
                      dataKey="ramo"
                      angle={-25}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="quantidade"
                      name="Leads"
                      fill="#37cdbe"
                      radius={[5, 5, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          GRÁFICOS — PERDAS + PAGAMENTOS
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* MOTIVOS DE PERDA */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Motivos de Perda
            </h2>

            <p className="text-sm text-base-content/60">
              Principais motivos registrados para leads perdidos.
            </p>


            <div className="h-[320px] mt-4">

              {dashboard.graficos.motivos_de_perda.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Nenhum lead perdido no filtro atual.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      dashboard.graficos.motivos_de_perda
                    }
                    layout="vertical"
                    margin={{
                      left: 30,
                      right: 20,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                    />

                    <YAxis
                      type="category"
                      dataKey="motivo"
                      width={130}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="quantidade"
                      name="Perdas"
                      fill="#f87272"
                      radius={[0, 5, 5, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>


        {/* PAGAMENTOS */}

        <div className="card bg-base-100 shadow-sm border border-base-300">

          <div className="card-body">

            <h2 className="card-title">
              Pagamentos por Status
            </h2>

            <p className="text-sm text-base-content/60">
              Distribuição dos pagamentos cadastrados.
            </p>


            <div className="h-[320px] mt-4">

              {dashboard.graficos.pagamentos_por_status.length === 0 ? (

                <div className="h-full flex items-center justify-center text-base-content/50">
                  Não há pagamentos para exibir.
                </div>

              ) : (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        dashboard.graficos.pagamentos_por_status
                      }
                      dataKey="quantidade"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >

                      {dashboard.graficos.pagamentos_por_status.map(
                        (_, index) => (

                          <Cell
                            key={`pagamento-${index}`}
                            fill={
                              CORES_GRAFICOS[
                                index %
                                CORES_GRAFICOS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              )}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          PROJETOS
      ====================================================== */}

      <div className="card bg-base-100 shadow-sm border border-base-300">

        <div className="card-body">

          <h2 className="card-title">
            Projetos por Status
          </h2>

          <p className="text-sm text-base-content/60">
            Distribuição dos projetos cadastrados.
          </p>


          <div className="h-[320px] mt-4">

            {dashboard.graficos.projetos_por_status.length === 0 ? (

              <div className="h-full flex items-center justify-center text-base-content/50">
                Não há projetos para exibir.
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    dashboard.graficos.projetos_por_status
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.2}
                  />

                  <XAxis
                    dataKey="status"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="quantidade"
                    name="Projetos"
                    fill="#3abff8"
                    radius={[5, 5, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          PRÓXIMAS AÇÕES
      ====================================================== */}

      <div className="card bg-base-100 shadow-sm border border-base-300">

        <div className="card-body">

          <div>

            <h2 className="card-title">
              Próximas Ações
            </h2>

            <p className="text-sm text-base-content/60">
              Próximos contatos e atividades comerciais.
            </p>

          </div>


          {dashboard.proximas_acoes.length === 0 ? (

            <div className="flex items-center justify-center py-12">

              <div className="text-center">

                <div className="text-4xl mb-3">
                  ✓
                </div>

                <p className="font-medium">
                  Nenhuma próxima ação
                </p>

                <p className="text-sm text-base-content/60 mt-1">
                  Não existem ações agendadas para os filtros atuais.
                </p>

              </div>

            </div>

          ) : (

            <div className="overflow-x-auto mt-4">

              <table className="table">

                <thead>

                  <tr>

                    <th>Data</th>
                    <th>Empresa</th>
                    <th>Ação</th>
                    <th>Responsável</th>
                    <th>Prioridade</th>
                    <th>Status</th>

                  </tr>

                </thead>


                <tbody>

                  {dashboard.proximas_acoes.map(
                    (item, index) => (

                      <tr
                        key={
                          `${item.origem}-${item.id}-${index}`
                        }
                      >

                        <td className="whitespace-nowrap">

                          <div className="font-medium">
                            {formatarData(item.data)}
                          </div>

                          {item.horario && (

                            <div className="text-xs text-base-content/60">
                              {item.horario}
                            </div>

                          )}

                        </td>


                        <td>

                          <div className="font-medium">
                            {item.empresa || "-"}
                          </div>

                        </td>


                        <td>
                          {item.acao || "-"}
                        </td>


                        <td>
                          {item.responsavel || "-"}
                        </td>


                        <td>

                          {item.prioridade ? (

                            <span className="badge badge-outline">
                              {item.prioridade}
                            </span>

                          ) : (
                            "-"
                          )}

                        </td>


                        <td>

                          {item.status ? (

                            <span className="badge badge-outline">
                              {item.status}
                            </span>

                          ) : (
                            "-"
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>


      {/* =====================================================
          INDICADORES COMERCIAIS
      ====================================================== */}

      <div className="card bg-base-100 shadow-sm border border-base-300">

        <div className="card-body">

          <div>

            <h2 className="card-title">
              Indicadores Comerciais
            </h2>

            <p className="text-sm text-base-content/60">
              Indicadores calculados considerando os filtros atuais.
            </p>

          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">

            {/* CONVERSÃO */}

            <div className="bg-base-200 rounded-xl p-5">

              <div className="text-sm text-base-content/60">
                Taxa de Conversão
              </div>

              <div className="text-3xl font-bold mt-2">
                {dashboard.indicadores.taxa_conversao}%
              </div>

              <div className="text-xs text-base-content/60 mt-1">
                Convertidos ÷ total de leads
              </div>

            </div>


            {/* PERDA */}

            <div className="bg-base-200 rounded-xl p-5">

              <div className="text-sm text-base-content/60">
                Taxa de Perda
              </div>

              <div className="text-3xl font-bold mt-2">
                {dashboard.indicadores.taxa_perda}%
              </div>

              <div className="text-xs text-base-content/60 mt-1">
                Perdidos ÷ total de leads
              </div>

            </div>


            {/* VALOR POTENCIAL */}

            <div className="bg-base-200 rounded-xl p-5">

              <div className="text-sm text-base-content/60">
                Valor Potencial
              </div>

              <div className="text-2xl font-bold mt-2">
                {formatarMoeda(
                  dashboard.indicadores.valor_potencial
                )}
              </div>

              <div className="text-xs text-base-content/60 mt-1">
                Potencial dos leads filtrados
              </div>

            </div>


            {/* TICKET MÉDIO */}

            <div className="bg-base-200 rounded-xl p-5">

              <div className="text-sm text-base-content/60">
                Ticket Potencial Médio
              </div>

              <div className="text-2xl font-bold mt-2">
                {formatarMoeda(
                  dashboard.indicadores.ticket_potencial_medio
                )}
              </div>

              <div className="text-xs text-base-content/60 mt-1">
                Média dos leads com valor
              </div>

            </div>


            {/* MRR */}

            <div className="bg-base-200 rounded-xl p-5">

              <div className="text-sm text-base-content/60">
                MRR
              </div>

              <div className="text-2xl font-bold mt-2">
                {formatarMoeda(
                  dashboard.planos.mrr
                )}
              </div>

              <div className="text-xs text-base-content/60 mt-1">
                Receita recorrente mensal
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          RODAPÉ
      ====================================================== */}

      <div className="text-center text-xs text-base-content/50 pb-4">

        Dashboard atualizado conforme os filtros selecionados.

      </div>

    </div>

  );
}