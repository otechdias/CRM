// FRONTEND/INTERACOES
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

/* =========================================================
   TIPOS
========================================================= */

type Origem = "lead" | "cliente";

interface Interacao {
  id: number;
  lead_id: number | null;
  cliente_id: number | null;
  lead_nome: string | null;
  cliente_nome: string | null;
  responsavel: string | null;
  tipo_interacao: string | null;
  data_interacao: string | null;
  resultado: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  descricao: string | null;
  resumo: string | null;
  created_at: string | null;
}

interface OrigemItem {
  id: number;
  nome_empresa: string | null;
  status_lead?: string | null;
}

interface InteracaoForm {
  origem: Origem;
  origem_id: string;
  tipo_interacao: string;
  data_interacao: string; // datetime-local: YYYY-MM-DDTHH:MM
  responsavel: string;
  resultado: string;
  proxima_acao: string;
  data_proxima_acao: string; // YYYY-MM-DD
  descricao: string;
}

/* =========================================================
   OPÇÕES (mesmas do backend)
========================================================= */

const TIPOS_INTERACAO = [
  "WhatsApp",
  "Ligação",
  "E-mail",
  "Instagram",
  "Reunião",
  "Presencial",
  "Follow-up",
  "Envio de proposta",
  "Outro",
];

const RESULTADOS = [
  "Sem resposta",
  "Respondeu",
  "Interessado",
  "Pediu mais informações",
  "Reunião agendada",
  "Proposta solicitada",
  "Negociando",
  "Fechado",
  "Sem interesse",
  "Retornar depois",
  "Contato inválido",
  "Outro",
];

const PROXIMAS_ACOES = [
  "Nenhuma",
  "Fazer primeiro contato",
  "Fazer follow-up",
  "Enviar apresentação",
  "Enviar portfólio",
  "Enviar briefing",
  "Agendar reunião",
  "Realizar reunião",
  "Enviar orçamento",
  "Reenviar orçamento",
  "Negociar proposta",
  "Aguardar resposta",
  "Enviar contrato",
  "Solicitar assinatura",
  "Solicitar pagamento",
  "Confirmar pagamento",
  "Solicitar materiais",
  "Entrar em contato novamente",
  "Fazer pós-venda",
  "Oferecer plano mensal",
  "Oferecer serviço adicional",
  "Outro",
];

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

/** "agora" no formato do <input type="datetime-local">, no fuso do navegador. */
const agoraLocal = () => {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const hojeLocal = () => agoraLocal().slice(0, 10);

/** "2026-09-21" -> "21/09/2026" (sem passar por Date, para não voltar um dia). */
const formatarData = (data?: string | null) => {
  if (!data) return "";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
};

/** "2026-09-21T10:30:00" -> "21/09/2026 10:30" */
const formatarDataHora = (dataHora?: string | null) => {
  if (!dataHora) return "-";
  const hora = dataHora.slice(11, 16);
  return `${formatarData(dataHora)}${hora ? ` ${hora}` : ""}`;
};

const mensagemErro = (error: unknown, padrao: string) => {
  if (axios.isAxiosError<{ erro?: string; detalhes?: string }>(error)) {
    return error.response?.data?.erro || error.response?.data?.detalhes || padrao;
  }
  return padrao;
};

const criarFormVazio = (): InteracaoForm => ({
  origem: "lead",
  origem_id: "",
  tipo_interacao: "",
  data_interacao: agoraLocal(),
  responsavel: "",
  resultado: "",
  proxima_acao: "",
  data_proxima_acao: "",
  descricao: "",
});

const formDaInteracao = (i: Interacao): InteracaoForm => ({
  origem: i.lead_id ? "lead" : "cliente",
  origem_id: String(i.lead_id ?? i.cliente_id ?? ""),
  tipo_interacao: i.tipo_interacao ?? "",
  data_interacao: (i.data_interacao ?? "").slice(0, 16),
  responsavel: i.responsavel ?? "",
  resultado: i.resultado ?? "",
  proxima_acao: i.proxima_acao ?? "",
  data_proxima_acao: i.data_proxima_acao ?? "",
  descricao: i.descricao ?? i.resumo ?? "",
});

const montarPayload = (f: InteracaoForm) => ({
  lead_id: f.origem === "lead" ? Number(f.origem_id) : null,
  cliente_id: f.origem === "cliente" ? Number(f.origem_id) : null,
  tipo_interacao: f.tipo_interacao,
  data_interacao: f.data_interacao,
  responsavel: f.responsavel.trim() || null,
  resultado: f.resultado || null,
  proxima_acao: f.proxima_acao || null,
  data_proxima_acao: f.data_proxima_acao || null,
  descricao: f.descricao.trim() || null,
});

const validarForm = (f: InteracaoForm): string | null => {
  if (!f.origem_id) {
    return `Selecione o ${f.origem === "lead" ? "lead" : "cliente"}.`;
  }

  if (!f.tipo_interacao) {
    return "Selecione o tipo de interação.";
  }

  if (!f.data_interacao) {
    return "Informe a data e a hora da interação.";
  }

  if (
    f.data_proxima_acao &&
    f.data_proxima_acao < f.data_interacao.slice(0, 10)
  ) {
    return "A data da próxima ação não pode ser anterior à data da interação.";
  }

  return null;
};

const nomeOrigem = (i: Interacao) =>
  (i.lead_id ? i.lead_nome : i.cliente_nome) || "-";

const chaveOrigem = (i: Interacao) =>
  i.lead_id ? `lead-${i.lead_id}` : `cliente-${i.cliente_id}`;

const getResultadoBadgeClass = (resultado?: string | null) => {
  switch (resultado) {
    case "Interessado":
    case "Reunião agendada":
    case "Proposta solicitada":
    case "Negociando":
    case "Fechado":
      return "badge badge-success badge-outline";

    case "Sem resposta":
    case "Retornar depois":
      return "badge badge-warning badge-outline";

    case "Sem interesse":
    case "Contato inválido":
      return "badge badge-error badge-outline";

    default:
      return "badge badge-ghost";
  }
};

/* =========================================================
   FORMULÁRIO (usado na criação e na edição)
========================================================= */

interface FormularioProps {
  form: InteracaoForm;
  onChange: (parcial: Partial<InteracaoForm>) => void;
  leads: OrigemItem[];
  clientes: OrigemItem[];
  origemBloqueada?: boolean;
}

function FormularioInteracao({
  form,
  onChange,
  leads,
  clientes,
  origemBloqueada = false,
}: FormularioProps) {
  const opcoesOrigem = form.origem === "lead" ? leads : clientes;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Vínculo */}
      <div>
        <label className="label">
          <span className="label-text">
            Registrar em <span className="text-error">*</span>
          </span>
        </label>

        <select
          className="select select-bordered w-full"
          value={form.origem}
          disabled={origemBloqueada}
          onChange={(e) =>
            onChange({ origem: e.target.value as Origem, origem_id: "" })
          }
        >
          <option value="lead">Lead</option>
          <option value="cliente">Cliente</option>
        </select>
      </div>

      <div>
        <label className="label">
          <span className="label-text">
            {form.origem === "lead" ? "Lead" : "Cliente"}{" "}
            <span className="text-error">*</span>
          </span>
        </label>

        <select
          className="select select-bordered w-full"
          value={form.origem_id}
          disabled={origemBloqueada}
          onChange={(e) => onChange({ origem_id: e.target.value })}
        >
          <option value="">
            Selecione o {form.origem === "lead" ? "lead" : "cliente"}
          </option>

          {opcoesOrigem.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome_empresa || `#${item.id}`}
              {item.status_lead === "Convertido" ? " (convertido)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo e data */}
      <div>
        <label className="label">
          <span className="label-text">
            Tipo de interação <span className="text-error">*</span>
          </span>
        </label>

        <select
          className="select select-bordered w-full"
          value={form.tipo_interacao}
          onChange={(e) => onChange({ tipo_interacao: e.target.value })}
        >
          <option value="">Selecione</option>

          {TIPOS_INTERACAO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">
          <span className="label-text">
            Data e hora <span className="text-error">*</span>
          </span>
        </label>

        <input
          type="datetime-local"
          className="input input-bordered w-full"
          value={form.data_interacao}
          onChange={(e) => onChange({ data_interacao: e.target.value })}
        />
      </div>

      {/* Responsável e resultado */}
      <div>
        <label className="label">
          <span className="label-text">Responsável</span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="Quem fez o contato"
          value={form.responsavel}
          onChange={(e) => onChange({ responsavel: e.target.value })}
        />
      </div>

      <div>
        <label className="label">
          <span className="label-text">Resultado</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={form.resultado}
          onChange={(e) => onChange({ resultado: e.target.value })}
        >
          <option value="">Selecione</option>

          {RESULTADOS.map((resultado) => (
            <option key={resultado} value={resultado}>
              {resultado}
            </option>
          ))}
        </select>
      </div>

      {/* Próxima ação */}
      <div>
        <label className="label">
          <span className="label-text">Próxima ação</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={form.proxima_acao}
          onChange={(e) => onChange({ proxima_acao: e.target.value })}
        >
          <option value="">Selecione</option>

          {PROXIMAS_ACOES.map((acao) => (
            <option key={acao} value={acao}>
              {acao}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">
          <span className="label-text">Data da próxima ação</span>
        </label>

        <input
          type="date"
          className="input input-bordered w-full"
          value={form.data_proxima_acao}
          onChange={(e) => onChange({ data_proxima_acao: e.target.value })}
        />
      </div>

      {/* Descrição */}
      <div className="md:col-span-2">
        <label className="label">
          <span className="label-text">Descrição</span>
        </label>

        <textarea
          className="textarea textarea-bordered w-full min-h-28"
          placeholder="O que foi conversado, combinado ou decidido..."
          value={form.descricao}
          onChange={(e) => onChange({ descricao: e.target.value })}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function InteracoesPage() {
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [leads, setLeads] = useState<OrigemItem[]>([]);
  const [clientes, setClientes] = useState<OrigemItem[]>([]);

  const [novo, setNovo] = useState<InteracaoForm>(criarFormVazio);
  const [editando, setEditando] = useState<{
    id: number;
    form: InteracaoForm;
  } | null>(null);

  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState<"" | Origem>("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroResultado, setFiltroResultado] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  const [hoje] = useState(hojeLocal);

  /* -------------------------------------------------------
     CARREGAR DADOS
  ------------------------------------------------------- */

  // Usada no primeiro carregamento (o estado inicial já é loading = true).
  // Só atualiza o estado dentro dos callbacks da requisição, como pede a
  // regra react-hooks/set-state-in-effect.
  const buscarInteracoes = () =>
    api
      .get<Interacao[]>("/interacoes/")
      .then((res) => {
        setInteracoes(res.data);
        setErroLista(null);
      })
      .catch((error) => {
        console.error("Erro ao carregar interações:", error);
        setErroLista(
          mensagemErro(error, "Não foi possível carregar as interações.")
        );
      })
      .finally(() => {
        setLoading(false);
      });

  // Usada nas recargas disparadas pelo usuário.
  const carregarInteracoes = async () => {
    setLoading(true);
    await buscarInteracoes();
  };

  const carregarOrigens = () => {
    const porNome = (a: OrigemItem, b: OrigemItem) =>
      (a.nome_empresa || "").localeCompare(b.nome_empresa || "", "pt-BR");

    return Promise.all([
      api.get<OrigemItem[]>("/leads/"),
      api.get<OrigemItem[]>("/clientes/"),
    ])
      .then(([resLeads, resClientes]) => {
        setLeads([...resLeads.data].sort(porNome));
        setClientes([...resClientes.data].sort(porNome));
      })
      .catch((error) => {
        console.error("Erro ao carregar leads e clientes:", error);
        setErroCriacao(
          mensagemErro(error, "Não foi possível carregar leads e clientes.")
        );
      });
  };

  useEffect(() => {
    buscarInteracoes();
    carregarOrigens();
  }, []);

  /* -------------------------------------------------------
     CRIAR
  ------------------------------------------------------- */

  const criar = async () => {
    setErroCriacao(null);

    const erro = validarForm(novo);

    if (erro) {
      setErroCriacao(erro);
      return;
    }

    setSalvando(true);

    try {
      await api.post("/interacoes/", montarPayload(novo));

      setNovo(criarFormVazio());

      await carregarInteracoes();
    } catch (error) {
      console.error("Erro ao criar interação:", error);
      setErroCriacao(
        mensagemErro(error, "Não foi possível salvar a interação.")
      );
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     EDITAR
  ------------------------------------------------------- */

  const abrirEdicao = (interacao: Interacao) => {
    setErroModal(null);
    setEditando({ id: interacao.id, form: formDaInteracao(interacao) });
  };

  const atualizar = async () => {
    if (!editando) return;

    setErroModal(null);

    const erro = validarForm(editando.form);

    if (erro) {
      setErroModal(erro);
      return;
    }

    setSalvando(true);

    try {
      await api.put(
        `/interacoes/${editando.id}`,
        montarPayload(editando.form)
      );

      setEditando(null);

      await carregarInteracoes();
    } catch (error) {
      console.error("Erro ao atualizar interação:", error);
      setErroModal(
        mensagemErro(error, "Não foi possível salvar as alterações.")
      );
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     EXCLUIR
  ------------------------------------------------------- */

  const deletar = async (interacao: Interacao) => {
    const confirmado = window.confirm(
      `Excluir a interação de ${formatarDataHora(
        interacao.data_interacao
      )} com "${nomeOrigem(interacao)}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    setExcluindoId(interacao.id);

    try {
      await api.delete(`/interacoes/${interacao.id}`);

      setInteracoes((anterior) =>
        anterior.filter((item) => item.id !== interacao.id)
      );
    } catch (error) {
      console.error("Erro ao excluir interação:", error);
      alert(mensagemErro(error, "Não foi possível excluir a interação."));
    } finally {
      setExcluindoId(null);
    }
  };

  /* -------------------------------------------------------
     LISTAGEM: FILTROS E "PRÓXIMA AÇÃO ATRASADA"
  ------------------------------------------------------- */

  const interacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return interacoes.filter((i) => {
      if (filtroOrigem === "lead" && !i.lead_id) return false;
      if (filtroOrigem === "cliente" && !i.cliente_id) return false;
      if (filtroTipo && i.tipo_interacao !== filtroTipo) return false;
      if (filtroResultado && i.resultado !== filtroResultado) return false;
      if (filtroResponsavel && i.responsavel !== filtroResponsavel) return false;
      const data = (i.data_interacao || i.data_proxima_acao || i.created_at || "").slice(0, 10);
      if (filtroDataDe && (!data || data < filtroDataDe)) return false;
      if (filtroDataAte && (!data || data > filtroDataAte)) return false;
      if (!termo) return true;

      return [
        nomeOrigem(i),
        i.responsavel,
        i.tipo_interacao,
        i.resultado,
        i.proxima_acao,
        i.descricao,
        i.resumo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [interacoes, busca, filtroOrigem, filtroTipo, filtroResultado, filtroResponsavel, filtroDataDe, filtroDataAte]);

  // A API devolve da mais recente para a mais antiga. Só a interação mais
  // recente de cada lead/cliente pode ser sinalizada como "atrasada";
  // as anteriores já foram superadas por um contato posterior.
  const maisRecentePorOrigem = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const i of interacoes) {
      const chave = chaveOrigem(i);
      if (!mapa.has(chave)) mapa.set(chave, i.id);
    }

    return mapa;
  }, [interacoes]);

  const temFiltro = Boolean(
    busca || filtroOrigem || filtroTipo || filtroResultado
  );

  const limparFiltros = () => {
    setBusca("");
    setFiltroOrigem("");
    setFiltroTipo("");
    setFiltroResultado("");
    setFiltroResponsavel("");
    setFiltroDataDe("");
    setFiltroDataAte("");
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div>
      <Navbar />

      <div className="p-6">
        {/* CABEÇALHO */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold">Interações</h2>

            <p className="text-base-content/60 mt-1">
              Registre cada contato com leads e clientes e defina o próximo
              passo.
            </p>
          </div>

          <div className="badge badge-lg">
            {interacoesFiltradas.length} interaç
            {interacoesFiltradas.length === 1 ? "ão" : "ões"}
          </div>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}

        <div className="card bg-base-200 p-5 mb-8">
          <h3 className="text-xl font-semibold mb-4">Nova interação</h3>

          {erroCriacao && (
            <div className="alert alert-error mb-4">
              <span>{erroCriacao}</span>
            </div>
          )}

          <FormularioInteracao
            form={novo}
            onChange={(parcial) =>
              setNovo((anterior) => ({ ...anterior, ...parcial }))
            }
            leads={leads}
            clientes={clientes}
          />

          <button
            className="btn btn-primary mt-6 self-start"
            onClick={criar}
            disabled={salvando}
          >
            {salvando ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Salvando...
              </>
            ) : (
              "Salvar interação"
            )}
          </button>
        </div>

        {/* FILTROS */}

        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <input
            className="input input-bordered flex-1"
            placeholder="Buscar por empresa, responsável, resultado, descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="select select-bordered"
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value as "" | Origem)}
          >
            <option value="">Leads e clientes</option>
            <option value="lead">Só leads</option>
            <option value="cliente">Só clientes</option>
          </select>

          <select
            className="select select-bordered"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos os tipos</option>

            {TIPOS_INTERACAO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
          >
            <option value="">Todos os resultados</option>

            {RESULTADOS.map((resultado) => (
              <option key={resultado} value={resultado}>
                {resultado}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <select className="select select-bordered" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {Array.from(new Set(interacoes.map((i) => i.responsavel).filter(Boolean) as string[])).sort().map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input type="date" className="input input-bordered" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} title="Data inicial" />
          <input type="date" className="input input-bordered" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} title="Data final" />
        </div>

        {temFiltro && (
            <button className="btn btn-ghost" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}

          <button
            className="btn btn-outline"
            onClick={carregarInteracoes}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Atualizar"
            )}
          </button>
        </div>

        {erroLista && (
          <div className="alert alert-error mb-4">
            <span>{erroLista}</span>

            <button className="btn btn-sm" onClick={carregarInteracoes}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* TABELA */}

        {loading && interacoes.length === 0 ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : interacoesFiltradas.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body items-center text-center py-16">
              <h3 className="text-xl font-semibold">
                {temFiltro
                  ? "Nenhuma interação encontrada"
                  : "Nenhuma interação registrada"}
              </h3>

              <p className="text-base-content/60">
                {temFiltro
                  ? "Ajuste ou limpe os filtros para ver mais resultados."
                  : "Registre o primeiro contato usando o formulário acima."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Origem</th>
                  <th>Tipo</th>
                  <th>Responsável</th>
                  <th>Resultado</th>
                  <th>Próxima ação</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {interacoesFiltradas.map((i) => {
                  const atrasada =
                    Boolean(i.data_proxima_acao) &&
                    i.proxima_acao !== "Nenhuma" &&
                    (i.data_proxima_acao as string) < hoje &&
                    maisRecentePorOrigem.get(chaveOrigem(i)) === i.id;

                  const descricao = i.descricao ?? i.resumo;

                  return (
                    <tr key={i.id}>
                      <td className="whitespace-nowrap">
                        {formatarDataHora(i.data_interacao)}
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              i.lead_id
                                ? "badge badge-info badge-outline"
                                : "badge badge-secondary badge-outline"
                            }
                          >
                            {i.lead_id ? "Lead" : "Cliente"}
                          </span>

                          <span className="font-medium">
                            {nomeOrigem(i)}
                          </span>
                        </div>
                      </td>

                      <td>{i.tipo_interacao || "-"}</td>

                      <td>{i.responsavel || "-"}</td>

                      <td>
                        {i.resultado ? (
                          <span className={getResultadoBadgeClass(i.resultado)}>
                            {i.resultado}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {i.proxima_acao || i.data_proxima_acao ? (
                          <div className="flex flex-col gap-1">
                            <span>{i.proxima_acao || "-"}</span>

                            {i.data_proxima_acao && (
                              <span className="text-xs text-base-content/60">
                                {formatarData(i.data_proxima_acao)}
                              </span>
                            )}

                            {atrasada && (
                              <span className="badge badge-error badge-sm">
                                Atrasada
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="max-w-xs">
                        {descricao ? (
                          <p className="line-clamp-2" title={descricao}>
                            {descricao}
                          </p>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-warning btn-xs"
                            onClick={() => abrirEdicao(i)}
                          >
                            Editar
                          </button>

                          <button
                            className="btn btn-error btn-xs"
                            onClick={() => deletar(i)}
                            disabled={excluindoId === i.id}
                          >
                            {excluindoId === i.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL DE EDIÇÃO */}

        {editando && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl">Editar interação</h3>

              <p className="text-sm text-base-content/60 mt-1">
                O lead ou cliente da interação não pode ser trocado. Para isso,
                exclua e registre novamente.
              </p>

              {erroModal && (
                <div className="alert alert-error my-4">
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="mt-4">
                <FormularioInteracao
                  form={editando.form}
                  onChange={(parcial) =>
                    setEditando((anterior) =>
                      anterior
                        ? {
                            ...anterior,
                            form: { ...anterior.form, ...parcial },
                          }
                        : anterior
                    )
                  }
                  leads={leads}
                  clientes={clientes}
                  origemBloqueada
                />
              </div>

              <div className="modal-action">
                <button
                  className="btn btn-primary"
                  onClick={atualizar}
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </button>

                <button
                  className="btn"
                  onClick={() => setEditando(null)}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div
              className="modal-backdrop"
              onClick={() => !salvando && setEditando(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}