// FRONTEND/PAGAMENTOS
"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

/* =========================================================
   TIPOS
========================================================= */

interface Pagamento {
  id: number;
  cliente_id: number;
  cliente_nome: string | null;
  projeto_id: number | null;
  projeto_nome: string | null;
  valor: number | null;
  tipo_pagamento: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status_pagamento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  dias_atraso: number | null;
  created_at: string | null;
}

interface Cliente {
  id: number;
  nome_empresa: string;
}

interface Projeto {
  id: number;
  cliente_id: number;
  nome_projeto: string;
  status_projeto: string | null;
  valor_projeto: number | null;
}

interface Resumo {
  total_a_receber: number;
  total_atrasado: number;
  total_recebido: number;
  recebido_no_mes: number;
}

interface Filtros {
  busca: string;
  cliente_id: string;
  status: string;
  forma_pagamento: string;
  vencimento_de: string;
  vencimento_ate: string;
}

interface PagamentoForm {
  cliente_id: string;
  projeto_id: string;
  valor: string;
  tipo_pagamento: string;
  forma_pagamento: string;
  numero_parcela: string;
  total_parcelas: string;
  data_vencimento: string;
  data_pagamento: string;
  status_pagamento: string;
  observacoes: string;
}

type Modal = { modo: "criar" } | { modo: "editar"; id: number } | null;

/* =========================================================
   OPÇÕES (iguais às do backend)
========================================================= */

const TIPOS_PAGAMENTO = [
  "Entrada",
  "Parcela",
  "Pagamento Único",
  "Saldo Final",
  "Mensalidade",
  "Serviço Adicional",
  "Outro",
];

const FORMAS_PAGAMENTO = [
  "Pix",
  "Boleto",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
  "Dinheiro",
  "Outro",
];

const FILTRO_STATUS = [
  { valor: "", rotulo: "Todos os status" },
  { valor: "Pendente,Atrasado", rotulo: "Em aberto" },
  { valor: "Pendente", rotulo: "Pendente" },
  { valor: "Atrasado", rotulo: "Atrasado" },
  { valor: "Pago", rotulo: "Pago" },
  { valor: "Cancelado", rotulo: "Cancelado" },
];

const MAX_PARCELAS = 60;

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  cliente_id: "",
  status: "",
  forma_pagamento: "",
  vencimento_de: "",
  vencimento_ate: "",
};

const FORM_VAZIO: PagamentoForm = {
  cliente_id: "",
  projeto_id: "",
  valor: "",
  tipo_pagamento: "",
  forma_pagamento: "",
  numero_parcela: "",
  total_parcelas: "1",
  data_vencimento: "",
  data_pagamento: "",
  status_pagamento: "Pendente",
  observacoes: "",
};

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

const formatarMoeda = (valor?: number | null) =>
  (valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Não usa new Date() para evitar o deslocamento de fuso (dia anterior).
const formatarData = (iso?: string | null) => {
  if (!iso) return "-";

  const [ano, mes, dia] = iso.split("-");

  return `${dia}/${mes}/${ano}`;
};

// Data de hoje no fuso do navegador (toISOString puro usaria UTC).
const hojeISO = () => {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());

  return agora.toISOString().split("T")[0];
};

const mensagemErro = (error: unknown, padrao: string) => {
  if (isAxiosError(error)) {
    const erro = error.response?.data?.erro || padrao;
    const detalhes = error.response?.data?.detalhes;

    // Erros 500 trazem o motivo real do banco em "detalhes"
    return detalhes ? `${erro} (${String(detalhes).slice(0, 300)})` : erro;
  }

  return padrao;
};

const getStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "Pago":
      return "badge badge-success";

    case "Pendente":
      return "badge badge-info";

    case "Atrasado":
      return "badge badge-error";

    case "Cancelado":
      return "badge badge-ghost";

    default:
      return "badge";
  }
};

const montarParams = (filtros: Filtros) =>
  Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== "")
  );

/* =========================================================
   COMPONENTE
========================================================= */

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [versao, setVersao] = useState(0);

  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<PagamentoForm>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  // Modal "Registrar pagamento" (botão Pagar)
  const [pagando, setPagando] = useState<Pagamento | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [formaPaga, setFormaPaga] = useState("");
  const [erroPagando, setErroPagando] = useState<string | null>(null);

  const recarregar = () => setVersao((v) => v + 1);

  /* -------------------------------------------------------
     CLIENTES E PROJETOS (para selects)
  ------------------------------------------------------- */

  useEffect(() => {
    api
      .get("/clientes/")
      .then((res) => setClientes(res.data))
      .catch((error) => console.error("Erro ao carregar clientes:", error));

    api
      .get("/projetos/")
      .then((res) => setProjetos(res.data))
      .catch((error) => console.error("Erro ao carregar projetos:", error));
  }, []);

  /* -------------------------------------------------------
     LISTA + RESUMO
     Recarrega quando os filtros mudam (com debounce, por causa
     do campo de busca) ou quando `versao` muda.
  ------------------------------------------------------- */

  useEffect(() => {
    let ativo = true;

    const timer = setTimeout(async () => {
      setCarregando(true);
      setErroLista(null);

      try {
        const params = montarParams(filtros);

        const [resLista, resResumo] = await Promise.all([
          api.get("/pagamentos/", { params }),
          api.get("/pagamentos/resumo", { params }),
        ]);

        if (!ativo) return;

        setPagamentos(resLista.data);
        setResumo(resResumo.data);
      } catch (error) {
        if (!ativo) return;

        console.error("Erro ao carregar pagamentos:", error);
        setErroLista(
          mensagemErro(error, "Não foi possível carregar os pagamentos.")
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }, 300);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [filtros, versao]);

  /* -------------------------------------------------------
     DADOS DERIVADOS DO FORMULÁRIO
  ------------------------------------------------------- */

  const criando = modal?.modo === "criar";
  const parcelas = Number(form.total_parcelas) || 1;
  const parcelando = criando && parcelas > 1;
  const valorNumerico = Number(form.valor);

  const projetosDoCliente = useMemo(
    () => projetos.filter((p) => p.cliente_id === Number(form.cliente_id)),
    [projetos, form.cliente_id]
  );

  const projetoSelecionado = projetosDoCliente.find(
    (p) => p.id === Number(form.projeto_id)
  );

  const filtrosAtivos = Object.values(filtros).some((v) => v !== "");

  /* -------------------------------------------------------
     FILTROS
  ------------------------------------------------------- */

  const alterarFiltro = (campo: keyof Filtros, valor: string) => {
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
  };

  /* -------------------------------------------------------
     FORMULÁRIO
  ------------------------------------------------------- */

  const alterarForm = (campo: keyof PagamentoForm, valor: string) => {
    setForm((anterior) => {
      const atualizado: PagamentoForm = { ...anterior, [campo]: valor };

      // Ao escolher o cliente, busca os projetos dele. Se houver só um,
      // já deixa selecionado; se houver vários, o usuário escolhe.
      if (campo === "cliente_id") {
        const doCliente = projetos.filter((p) => p.cliente_id === Number(valor));

        atualizado.projeto_id =
          doCliente.length === 1 ? String(doCliente[0].id) : "";
      }

      if (campo === "status_pagamento" && valor !== "Pago") {
        atualizado.data_pagamento = "";
      }

      return atualizado;
    });
  };

  const atualizarOpcoes = () => {
    api
      .get("/clientes/")
      .then((res) => setClientes(res.data))
      .catch((error) => console.error("Erro ao carregar clientes:", error));

    api
      .get("/projetos/")
      .then((res) => setProjetos(res.data))
      .catch((error) => console.error("Erro ao carregar projetos:", error));
  };

  const abrirCriar = () => {
    atualizarOpcoes();
    setForm({ ...FORM_VAZIO });
    setErroForm(null);
    setModal({ modo: "criar" });
  };

  const abrirEditar = (p: Pagamento) => {
    atualizarOpcoes();
    setForm({
      cliente_id: String(p.cliente_id),
      projeto_id: p.projeto_id ? String(p.projeto_id) : "",
      valor: p.valor !== null ? String(p.valor) : "",
      tipo_pagamento: p.tipo_pagamento ?? "",
      forma_pagamento: p.forma_pagamento ?? "",
      numero_parcela: p.numero_parcela ? String(p.numero_parcela) : "",
      total_parcelas: p.total_parcelas ? String(p.total_parcelas) : "",
      data_vencimento: p.data_vencimento ?? "",
      data_pagamento: p.data_pagamento ?? "",
      // "Atrasado" é calculado pelo sistema a partir do vencimento
      status_pagamento:
        !p.status_pagamento || p.status_pagamento === "Atrasado"
          ? "Pendente"
          : p.status_pagamento,
      observacoes: p.observacoes ?? "",
    });

    setErroForm(null);
    setModal({ modo: "editar", id: p.id });
  };

  const fecharModal = () => {
    if (salvando) return;

    setModal(null);
    setErroForm(null);
  };

  const validarForm = (): string | null => {
    if (!form.cliente_id) return "Selecione o cliente.";

    if (!form.valor || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      return parcelando
        ? "Informe um valor total maior que zero."
        : "Informe um valor maior que zero.";
    }

    if (!form.data_vencimento) return "Informe a data de vencimento.";

    if (criando) {
      if (
        !Number.isInteger(parcelas) ||
        parcelas < 1 ||
        parcelas > MAX_PARCELAS
      ) {
        return `O número de parcelas deve estar entre 1 e ${MAX_PARCELAS}.`;
      }
    } else if (form.numero_parcela && !form.total_parcelas) {
      return "Informe o total de parcelas.";
    }

    return null;
  };

  /* -------------------------------------------------------
     SALVAR (criar ou editar)
  ------------------------------------------------------- */

  const salvar = async () => {
    if (!modal) return;

    const erro = validarForm();

    if (erro) {
      setErroForm(erro);
      return;
    }

    setSalvando(true);
    setErroForm(null);

    try {
      if (modal.modo === "criar") {
        const payload: Record<string, unknown> = {
          cliente_id: Number(form.cliente_id),
          projeto_id: form.projeto_id ? Number(form.projeto_id) : null,
          tipo_pagamento: form.tipo_pagamento || null,
          forma_pagamento: form.forma_pagamento || null,
          data_vencimento: form.data_vencimento,
          observacoes: form.observacoes || null,
        };

        if (parcelas > 1) {
          // O backend divide o total e gera uma parcela por mês
          payload.valor_total = valorNumerico;
          payload.total_parcelas = parcelas;
        } else {
          payload.valor = valorNumerico;
          payload.status_pagamento = form.status_pagamento;
          payload.data_pagamento =
            form.status_pagamento === "Pago"
              ? form.data_pagamento || null
              : null;
        }

        await api.post("/pagamentos/", payload);
      } else {
        await api.put(`/pagamentos/${modal.id}`, {
          cliente_id: Number(form.cliente_id),
          projeto_id: form.projeto_id ? Number(form.projeto_id) : null,
          valor: valorNumerico,
          tipo_pagamento: form.tipo_pagamento || null,
          forma_pagamento: form.forma_pagamento || null,
          numero_parcela: form.numero_parcela
            ? Number(form.numero_parcela)
            : null,
          total_parcelas: form.total_parcelas
            ? Number(form.total_parcelas)
            : null,
          data_vencimento: form.data_vencimento,
          status_pagamento: form.status_pagamento,
          data_pagamento:
            form.status_pagamento === "Pago"
              ? form.data_pagamento || null
              : null,
          observacoes: form.observacoes || null,
        });
      }

      setModal(null);
      recarregar();
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error);
      setErroForm(mensagemErro(error, "Não foi possível salvar o pagamento."));
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     REGISTRAR PAGAMENTO (botão Pagar: pergunta a data)
  ------------------------------------------------------- */

  const abrirPagamento = (p: Pagamento) => {
    setPagando(p);
    setDataPagamento(hojeISO());
    setFormaPaga(p.forma_pagamento ?? "");
    setErroPagando(null);
  };

  const fecharPagamento = () => {
    if (salvando) return;

    setPagando(null);
    setErroPagando(null);
  };

  const confirmarPagamento = async () => {
    if (!pagando) return;

    if (!dataPagamento) {
      setErroPagando("Informe a data em que o pagamento foi realizado.");
      return;
    }

    if (dataPagamento > hojeISO()) {
      setErroPagando("A data do pagamento não pode ser no futuro.");
      return;
    }

    setSalvando(true);
    setErroPagando(null);

    try {
      await api.put(`/pagamentos/${pagando.id}`, {
        status_pagamento: "Pago",
        data_pagamento: dataPagamento,
        forma_pagamento: formaPaga || null,
      });

      setPagando(null);
      recarregar();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setErroPagando(
        mensagemErro(error, "Não foi possível registrar o pagamento.")
      );
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     EXCLUIR
  ------------------------------------------------------- */

  const excluir = async (p: Pagamento) => {
    const confirmado = window.confirm(
      `Excluir o pagamento de ${formatarMoeda(p.valor)} de "${
        p.cliente_nome ?? `cliente ${p.cliente_id}`
      }"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    try {
      setProcessandoId(p.id);

      await api.delete(`/pagamentos/${p.id}`);

      recarregar();
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      alert(mensagemErro(error, "Não foi possível excluir o pagamento."));
    } finally {
      setProcessandoId(null);
    }
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div>
      <Navbar />

      <div className="p-6">
        {/* ================= CABEÇALHO ================= */}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Pagamentos</h2>

            <p className="text-base-content/60 mt-1">
              Acompanhe cobranças, parcelas e vencimentos dos clientes.
            </p>
          </div>

          <button className="btn btn-primary" onClick={abrirCriar}>
            + Adicionar Pagamento
          </button>
        </div>

        {/* ================= RESUMO ================= */}

        <div className="stats stats-vertical md:stats-horizontal shadow bg-base-100 w-full mb-6">
          <div className="stat">
            <div className="stat-title">A receber</div>
            <div className="stat-value text-2xl">
              {formatarMoeda(resumo?.total_a_receber)}
            </div>
            <div className="stat-desc">Pendente + atrasado</div>
          </div>

          <div className="stat">
            <div className="stat-title">Em atraso</div>
            <div className="stat-value text-2xl text-error">
              {formatarMoeda(resumo?.total_atrasado)}
            </div>
            <div className="stat-desc">Vencidos e não pagos</div>
          </div>

          <div className="stat">
            <div className="stat-title">Recebido</div>
            <div className="stat-value text-2xl text-success">
              {formatarMoeda(resumo?.total_recebido)}
            </div>
            <div className="stat-desc">Total pago</div>
          </div>

          <div className="stat">
            <div className="stat-title">Recebido no mês</div>
            <div className="stat-value text-2xl">
              {formatarMoeda(resumo?.recebido_no_mes)}
            </div>
            <div className="stat-desc">Não depende dos filtros</div>
          </div>
        </div>

        {/* ================= FILTROS ================= */}

        <div className="card bg-base-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="label">
                <span className="label-text">Buscar</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Cliente, projeto ou observação"
                value={filtros.busca}
                onChange={(e) => alterarFiltro("busca", e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Cliente</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={filtros.cliente_id}
                onChange={(e) => alterarFiltro("cliente_id", e.target.value)}
              >
                <option value="">Todos os clientes</option>

                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_empresa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Status</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={filtros.status}
                onChange={(e) => alterarFiltro("status", e.target.value)}
              >
                {FILTRO_STATUS.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Forma de pagamento</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={filtros.forma_pagamento}
                onChange={(e) =>
                  alterarFiltro("forma_pagamento", e.target.value)
                }
              >
                <option value="">Todas as formas</option>

                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Vencimento de</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={filtros.vencimento_de}
                onChange={(e) => alterarFiltro("vencimento_de", e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Vencimento até</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={filtros.vencimento_ate}
                onChange={(e) =>
                  alterarFiltro("vencimento_ate", e.target.value)
                }
              />
            </div>

            <div className="flex items-end">
              <button
                className="btn btn-outline w-full"
                onClick={() => setFiltros(FILTROS_VAZIOS)}
                disabled={!filtrosAtivos}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {erroLista && (
          <div className="alert alert-error mb-4">
            <span>{erroLista}</span>

            <button className="btn btn-sm" onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* ================= TABELA ================= */}

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Tipo</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Pago em</th>
                <th>Forma</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando && pagamentos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    Carregando pagamentos...
                  </td>
                </tr>
              ) : pagamentos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    {filtrosAtivos
                      ? "Nenhum pagamento encontrado com esses filtros."
                      : "Nenhum pagamento cadastrado."}
                  </td>
                </tr>
              ) : (
                pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>

                    <td className="font-medium">
                      {p.cliente_nome ?? `ID: ${p.cliente_id}`}
                    </td>

                    <td>{p.projeto_nome ?? "-"}</td>

                    <td>{p.tipo_pagamento ?? "-"}</td>

                    <td>
                      {p.numero_parcela && p.total_parcelas
                        ? `${p.numero_parcela}/${p.total_parcelas}`
                        : "-"}
                    </td>

                    <td>{formatarMoeda(p.valor)}</td>

                    <td>{formatarData(p.data_vencimento)}</td>

                    <td>{formatarData(p.data_pagamento)}</td>

                    <td>{p.forma_pagamento ?? "-"}</td>

                    <td>
                      <span className={getStatusBadgeClass(p.status_pagamento)}>
                        {p.status_pagamento ?? "-"}
                      </span>

                      {p.dias_atraso !== null && (
                        <div className="text-xs text-error mt-1">
                          {p.dias_atraso} dia{p.dias_atraso !== 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="flex gap-2">
                        {(p.status_pagamento === "Pendente" ||
                          p.status_pagamento === "Atrasado") && (
                          <button
                            className="btn btn-success btn-xs"
                            onClick={() => abrirPagamento(p)}
                            disabled={processandoId === p.id}
                          >
                            Pagar
                          </button>
                        )}

                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => abrirEditar(p)}
                          disabled={processandoId === p.id}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => excluir(p)}
                          disabled={processandoId === p.id}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================= MODAL ================= */}

        {modal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl">
                {criando ? "Adicionar Pagamento" : `Editar Pagamento #${modal.modo === "editar" ? modal.id : ""}`}
              </h3>

              {erroForm && (
                <div className="alert alert-error mt-4">
                  <span>{erroForm}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Cliente */}
                <div>
                  <label className="label">
                    <span className="label-text">Cliente *</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.cliente_id}
                    onChange={(e) => alterarForm("cliente_id", e.target.value)}
                  >
                    <option value="">Selecione o cliente</option>

                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_empresa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Projeto */}
                <div>
                  <label className="label">
                    <span className="label-text">Projeto</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.projeto_id}
                    disabled={!form.cliente_id}
                    onChange={(e) => alterarForm("projeto_id", e.target.value)}
                  >
                    <option value="">
                      {form.cliente_id
                        ? projetosDoCliente.length === 0
                          ? "Cliente sem projetos"
                          : "Selecione o projeto"
                        : "Selecione o cliente primeiro"}
                    </option>

                    {projetosDoCliente.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome_projeto}
                        {p.status_projeto ? ` (${p.status_projeto})` : ""}
                      </option>
                    ))}
                  </select>

                  {form.cliente_id && (
                    <p className="text-xs text-base-content/60 mt-1">
                      {projetosDoCliente.length === 0
                        ? "Este cliente não tem projetos. O pagamento pode ser salvo sem projeto."
                        : projetoSelecionado
                          ? projetoSelecionado.valor_projeto !== null
                            ? `Valor do projeto: ${formatarMoeda(projetoSelecionado.valor_projeto)}`
                            : "Projeto selecionado."
                          : `${projetosDoCliente.length} projetos encontrados. Escolha um.`}
                    </p>
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label className="label">
                    <span className="label-text">Tipo de pagamento</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.tipo_pagamento}
                    onChange={(e) =>
                      alterarForm("tipo_pagamento", e.target.value)
                    }
                  >
                    <option value="">Automático</option>

                    {TIPOS_PAGAMENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Forma */}
                <div>
                  <label className="label">
                    <span className="label-text">Forma de pagamento</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.forma_pagamento}
                    onChange={(e) =>
                      alterarForm("forma_pagamento", e.target.value)
                    }
                  >
                    <option value="">Selecione</option>

                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      {parcelando ? "Valor total (R$) *" : "Valor (R$) *"}
                    </span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full"
                    placeholder="Ex: 1500.00"
                    value={form.valor}
                    onChange={(e) => alterarForm("valor", e.target.value)}
                  />
                </div>

                {/* Parcelas */}
                {criando ? (
                  <div>
                    <label className="label">
                      <span className="label-text">Número de parcelas</span>
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={MAX_PARCELAS}
                      className="input input-bordered w-full"
                      value={form.total_parcelas}
                      onChange={(e) =>
                        alterarForm("total_parcelas", e.target.value)
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">
                      <span className="label-text">Parcela (n / total)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        className="input input-bordered w-full"
                        placeholder="n"
                        value={form.numero_parcela}
                        onChange={(e) =>
                          alterarForm("numero_parcela", e.target.value)
                        }
                      />

                      <span>/</span>

                      <input
                        type="number"
                        min="1"
                        max={MAX_PARCELAS}
                        className="input input-bordered w-full"
                        placeholder="total"
                        value={form.total_parcelas}
                        onChange={(e) =>
                          alterarForm("total_parcelas", e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Vencimento */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      {parcelando ? "Vencimento da 1ª parcela *" : "Vencimento *"}
                    </span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.data_vencimento}
                    onChange={(e) =>
                      alterarForm("data_vencimento", e.target.value)
                    }
                  />
                </div>

                {/* Status (parcelas nascem como Pendente) */}
                {!parcelando && (
                  <div>
                    <label className="label">
                      <span className="label-text">Status</span>
                    </label>

                    <select
                      className="select select-bordered w-full"
                      value={form.status_pagamento}
                      onChange={(e) =>
                        alterarForm("status_pagamento", e.target.value)
                      }
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>

                    <p className="text-xs text-base-content/60 mt-1">
                      Vencido e não pago vira “Atrasado” automaticamente.
                    </p>
                  </div>
                )}

                {/* Data de pagamento */}
                {!parcelando && form.status_pagamento === "Pago" && (
                  <div>
                    <label className="label">
                      <span className="label-text">Data do pagamento</span>
                    </label>

                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.data_pagamento}
                      onChange={(e) =>
                        alterarForm("data_pagamento", e.target.value)
                      }
                    />

                    <p className="text-xs text-base-content/60 mt-1">
                      Em branco, usa a data de hoje.
                    </p>
                  </div>
                )}

                {/* Aviso do parcelamento */}
                {parcelando && (
                  <div className="alert alert-info md:col-span-2">
                    <span>
                      {valorNumerico > 0
                        ? `${parcelas} parcelas mensais de cerca de ${formatarMoeda(
                            valorNumerico / parcelas
                          )}. `
                        : `${parcelas} parcelas mensais. `}
                      As parcelas são criadas como Pendente; registre cada
                      pagamento depois.
                    </span>
                  </div>
                )}

                {/* Observações */}
                <div className="md:col-span-2">
                  <label className="label">
                    <span className="label-text">Observações</span>
                  </label>

                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => alterarForm("observacoes", e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-action">
                <button
                  className="btn btn-primary"
                  onClick={salvar}
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Salvando...
                    </>
                  ) : criando && parcelando ? (
                    `Criar ${parcelas} parcelas`
                  ) : (
                    "Salvar"
                  )}
                </button>

                <button
                  className="btn"
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="modal-backdrop" onClick={fecharModal} />
          </div>
        )}

        {/* ================= MODAL: REGISTRAR PAGAMENTO ================= */}

        {pagando && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-xl">Registrar pagamento</h3>

              <p className="text-sm text-base-content/60 mt-1">
                {pagando.cliente_nome ?? `Cliente ${pagando.cliente_id}`}
                {pagando.projeto_nome ? ` · ${pagando.projeto_nome}` : ""}
              </p>

              <div className="bg-base-200 rounded-lg p-3 mt-4 text-sm">
                <div className="flex justify-between">
                  <span>Valor</span>
                  <span className="font-semibold">
                    {formatarMoeda(pagando.valor)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Vencimento</span>
                  <span>{formatarData(pagando.data_vencimento)}</span>
                </div>

                {pagando.numero_parcela && pagando.total_parcelas && (
                  <div className="flex justify-between">
                    <span>Parcela</span>
                    <span>
                      {pagando.numero_parcela}/{pagando.total_parcelas}
                    </span>
                  </div>
                )}
              </div>

              {erroPagando && (
                <div className="alert alert-error mt-4">
                  <span>{erroPagando}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="label">
                    <span className="label-text">Data do pagamento *</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    max={hojeISO()}
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Forma de pagamento</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={formaPaga}
                    onChange={(e) => setFormaPaga(e.target.value)}
                  >
                    <option value="">Selecione</option>

                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-action">
                <button
                  className="btn btn-success"
                  onClick={confirmarPagamento}
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Salvando...
                    </>
                  ) : (
                    "Confirmar pagamento"
                  )}
                </button>

                <button
                  className="btn"
                  onClick={fecharPagamento}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="modal-backdrop" onClick={fecharPagamento} />
          </div>
        )}
      </div>
    </div>
  );
}