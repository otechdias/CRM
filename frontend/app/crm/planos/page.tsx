// FRONTEND/PLANOS
"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

/* =========================================================
   TIPOS
========================================================= */

interface Plano {
  id: number;
  cliente_id: number;
  cliente_nome?: string | null;

  nome_plano: string | null;
  valor_mensal: number | null;
  dia_cobranca: number | null;
  status_plano: string | null;
  tipo_cobranca: string | null;

  data_inicio: string | null;
  proximo_vencimento: string | null;
  forma_pagamento: string | null;

  data_cancelamento: string | null;
  motivo_cancelamento: string | null;

  observacoes: string | null;
  created_at: string | null;
}

interface Cliente {
  id: number;
  nome_empresa: string;
}

interface PlanoForm {
  cliente_id: string;
  nome_plano: string;
  valor_mensal: string;
  dia_cobranca: string;
  status_plano: string;
  tipo_cobranca: string;
  data_inicio: string;
  proximo_vencimento: string;
  forma_pagamento: string;
  data_cancelamento: string;
  motivo_cancelamento: string;
  observacoes: string;
}

/* =========================================================
   OPÇÕES (iguais às do backend)
========================================================= */

const NOMES_PLANO = [
  "Plano Essencial",
  "Plano Pro",
  "Plano Pro Max",
];

const STATUS_PLANO = ["Ativo", "Pausado", "Cancelado"];

const TIPOS_COBRANCA = [
  "Mensal",
  "Trimestral",
  "Semestral",
  "Anual",
];

const FORMAS_PAGAMENTO = [
  "PIX",
  "Boleto",
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência bancária",
  "Dinheiro",
];

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

const hoje = () => new Date().toISOString().split("T")[0];

const formVazio = (): PlanoForm => ({
  cliente_id: "",
  nome_plano: "",
  valor_mensal: "",
  dia_cobranca: "",
  status_plano: "Ativo",
  tipo_cobranca: "Mensal",
  data_inicio: hoje(),
  proximo_vencimento: "",
  forma_pagamento: "",
  data_cancelamento: "",
  motivo_cancelamento: "",
  observacoes: "",
});

const paraForm = (plano: Plano): PlanoForm => ({
  cliente_id: String(plano.cliente_id),
  nome_plano: plano.nome_plano ?? "",
  valor_mensal:
    plano.valor_mensal !== null &&
    plano.valor_mensal !== undefined
      ? String(plano.valor_mensal)
      : "",
  dia_cobranca: plano.dia_cobranca
    ? String(plano.dia_cobranca)
    : "",
  status_plano: plano.status_plano ?? "Ativo",
  tipo_cobranca: plano.tipo_cobranca ?? "Mensal",
  data_inicio: plano.data_inicio ?? "",
  proximo_vencimento: plano.proximo_vencimento ?? "",
  forma_pagamento: plano.forma_pagamento ?? "",
  data_cancelamento: plano.data_cancelamento ?? "",
  motivo_cancelamento: plano.motivo_cancelamento ?? "",
  observacoes: plano.observacoes ?? "",
});

const montarPayload = (form: PlanoForm) => {
  const cancelado = form.status_plano === "Cancelado";

  return {
    cliente_id: Number(form.cliente_id),
    nome_plano: form.nome_plano,
    valor_mensal:
      form.valor_mensal === ""
        ? null
        : Number(form.valor_mensal),
    dia_cobranca:
      form.dia_cobranca === ""
        ? null
        : Number(form.dia_cobranca),
    status_plano: form.status_plano,
    tipo_cobranca: form.tipo_cobranca,
    data_inicio: form.data_inicio || null,
    // Vazio: o backend calcula pelo dia de cobrança
    proximo_vencimento: cancelado
      ? null
      : form.proximo_vencimento || null,
    forma_pagamento: form.forma_pagamento || null,
    data_cancelamento: cancelado
      ? form.data_cancelamento || null
      : null,
    motivo_cancelamento: cancelado
      ? form.motivo_cancelamento.trim() || null
      : null,
    observacoes: form.observacoes.trim() || null,
  };
};

const validar = (form: PlanoForm): string | null => {
  if (!form.cliente_id) {
    return "Selecione um cliente.";
  }

  if (!form.nome_plano) {
    return "Selecione o nome do plano.";
  }

  if (
    form.valor_mensal === "" ||
    Number.isNaN(Number(form.valor_mensal)) ||
    Number(form.valor_mensal) < 0
  ) {
    return "Informe um valor mensal válido.";
  }

  const dia = Number(form.dia_cobranca);

  if (
    !form.dia_cobranca ||
    !Number.isInteger(dia) ||
    dia < 1 ||
    dia > 31
  ) {
    return "Informe o dia de cobrança (1 a 31).";
  }

  if (form.status_plano === "Cancelado") {
    if (!form.motivo_cancelamento.trim()) {
      return "Informe o motivo do cancelamento.";
    }

    if (
      form.data_cancelamento &&
      form.data_inicio &&
      form.data_cancelamento < form.data_inicio
    ) {
      return "A data de cancelamento não pode ser anterior à data de início.";
    }
  }

  return null;
};

const extrairErro = (error: unknown, padrao: string) => {
  const e = error as {
    response?: {
      data?: { erro?: string; detalhes?: string };
    };
  };

  return (
    e?.response?.data?.erro ||
    e?.response?.data?.detalhes ||
    padrao
  );
};

const formatarMoeda = (valor?: number | null) => {
  if (valor === null || valor === undefined) {
    return "-";
  }

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatarData = (data?: string | null) => {
  if (!data) return "-";

  const [ano, mes, dia] = data.split("T")[0].split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
};

const getStatusBadgeClass = (status?: string | null) => {
  switch (status?.toLowerCase()) {
    case "ativo":
      return "badge badge-success";

    case "pausado":
      return "badge badge-warning";

    case "cancelado":
      return "badge badge-error";

    default:
      return "badge";
  }
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] =
    useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] =
    useState<number | null>(null);
  const [form, setForm] = useState<PlanoForm>(formVazio);
  const [erroModal, setErroModal] =
    useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [excluindoId, setExcluindoId] =
    useState<number | null>(null);

  /* =======================================================
     CARREGAR DADOS
  ======================================================= */

  const carregar = async () => {
    setCarregando(true);
    setErroLista(null);

    try {
      const [resPlanos, resClientes] = await Promise.all([
        api.get("/planos/"),
        api.get("/clientes/"),
      ]);

      setPlanos(resPlanos.data);
      setClientes(resClientes.data);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);

      setErroLista(
        extrairErro(
          error,
          "Não foi possível carregar os planos."
        )
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  /* =======================================================
     MODAL
  ======================================================= */

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formVazio());
    setErroModal(null);
    setModalAberto(true);
  };

  const abrirEdicao = (plano: Plano) => {
    setEditandoId(plano.id);
    setForm(paraForm(plano));
    setErroModal(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setErroModal(null);
  };

  const alterar = (campo: keyof PlanoForm, valor: string) => {
    setForm((anterior) => {
      const atualizado = { ...anterior, [campo]: valor };

      if (campo === "status_plano") {
        if (valor === "Cancelado") {
          atualizado.data_cancelamento =
            anterior.data_cancelamento || hoje();
          atualizado.proximo_vencimento = "";
        } else {
          atualizado.data_cancelamento = "";
          atualizado.motivo_cancelamento = "";
        }
      }

      return atualizado;
    });
  };

  /* =======================================================
     SALVAR (CRIAR / ATUALIZAR)
  ======================================================= */

  const salvar = async () => {
    const erro = validar(form);

    if (erro) {
      setErroModal(erro);
      return;
    }

    setSalvando(true);
    setErroModal(null);

    try {
      const payload = montarPayload(form);

      if (editandoId !== null) {
        await api.put(`/planos/${editandoId}`, payload);
      } else {
        await api.post("/planos/", payload);
      }

      fecharModal();
      await carregar();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);

      setErroModal(
        extrairErro(
          error,
          "Não foi possível salvar o plano."
        )
      );
    } finally {
      setSalvando(false);
    }
  };

  /* =======================================================
     EXCLUIR
  ======================================================= */

  const deletar = async (plano: Plano) => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir o plano "${plano.nome_plano}" de ${
        plano.cliente_nome || `cliente #${plano.cliente_id}`
      }?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    try {
      setExcluindoId(plano.id);

      await api.delete(`/planos/${plano.id}`);

      setPlanos((anterior) =>
        anterior.filter((item) => item.id !== plano.id)
      );
    } catch (error) {
      console.error("Erro ao excluir plano:", error);

      alert(
        extrairErro(
          error,
          "Não foi possível excluir o plano."
        )
      );
    } finally {
      setExcluindoId(null);
    }
  };

  /* =======================================================
     FILTROS
  ======================================================= */

  const planosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return planos.filter((plano) => {
      if (filtroStatus && plano.status_plano !== filtroStatus) return false;
      const data = (plano.proximo_vencimento || plano.data_inicio || plano.created_at || "").slice(0, 10);
      if (filtroDataDe && (!data || data < filtroDataDe)) return false;
      if (filtroDataAte && (!data || data > filtroDataAte)) return false;
      if (!termo) return true;

      const texto = [
        plano.id,
        plano.cliente_nome,
        plano.nome_plano,
        plano.forma_pagamento,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [planos, busca, filtroStatus, filtroDataDe, filtroDataAte]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div>
      <Navbar />

      <div className="p-6">
        {/* CABEÇALHO */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold">
              Planos Recorrentes
            </h2>

            <p className="text-base-content/60 mt-1">
              Gerencie os planos e mensalidades dos clientes.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={abrirNovo}
          >
            + Adicionar Plano
          </button>
        </div>

        {/* FILTROS */}

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            className="input input-bordered flex-1"
            placeholder="Buscar por cliente, plano, forma de pagamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="select select-bordered"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>

            {STATUS_PLANO.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input type="date" className="input input-bordered" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} title="Data inicial" />
          <input type="date" className="input input-bordered" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} title="Data final" />
          <button className="btn btn-outline" onClick={() => { setBusca(""); setFiltroStatus(""); setFiltroDataDe(""); setFiltroDataAte(""); }} disabled={!busca && !filtroStatus && !filtroDataDe && !filtroDataAte}>Limpar filtros</button>
          <button
            className="btn btn-outline"
            onClick={carregar}
            disabled={carregando}
          >
            {carregando ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Atualizar"
            )}
          </button>
        </div>

        {erroLista && (
          <div className="alert alert-error mb-4">
            <span>{erroLista}</span>

            <button className="btn btn-sm" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* TABELA */}

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Plano</th>
                <th>Valor Mensal</th>
                <th>Dia</th>
                <th>Cobrança</th>
                <th>Próx. Vencimento</th>
                <th>Forma de Pagamento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    Carregando planos...
                  </td>
                </tr>
              ) : planosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    {planos.length === 0
                      ? "Nenhum plano cadastrado."
                      : "Nenhum plano encontrado."}
                  </td>
                </tr>
              ) : (
                planosFiltrados.map((plano) => (
                  <tr key={plano.id}>
                    <td>{plano.id}</td>

                    <td className="font-medium">
                      {plano.cliente_nome ||
                        `ID: ${plano.cliente_id}`}
                    </td>

                    <td>{plano.nome_plano || "-"}</td>

                    <td>{formatarMoeda(plano.valor_mensal)}</td>

                    <td>{plano.dia_cobranca ?? "-"}</td>

                    <td>{plano.tipo_cobranca || "-"}</td>

                    <td>
                      {formatarData(plano.proximo_vencimento)}
                    </td>

                    <td>{plano.forma_pagamento || "-"}</td>

                    <td>
                      <span
                        className={getStatusBadgeClass(
                          plano.status_plano
                        )}
                      >
                        {plano.status_plano || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => abrirEdicao(plano)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => deletar(plano)}
                          disabled={excluindoId === plano.id}
                        >
                          {excluindoId === plano.id
                            ? "Excluindo..."
                            : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
            MODAL (ADICIONAR / EDITAR)
        ================================================= */}

        {modalAberto && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl">
                {editandoId !== null
                  ? `Editar Plano #${editandoId}`
                  : "Adicionar Plano"}
              </h3>

              {erroModal && (
                <div className="alert alert-error my-4">
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Cliente */}

                <div className="md:col-span-2">
                  <label className="label">
                    <span className="label-text">
                      Cliente{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.cliente_id}
                    onChange={(e) =>
                      alterar("cliente_id", e.target.value)
                    }
                  >
                    <option value="">
                      Selecione o cliente
                    </option>

                    {clientes.map((cliente) => (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.nome_empresa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome do plano */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Nome do Plano{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.nome_plano}
                    onChange={(e) =>
                      alterar("nome_plano", e.target.value)
                    }
                  >
                    <option value="">
                      Selecione o plano
                    </option>

                    {NOMES_PLANO.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor mensal */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Valor Mensal{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full"
                    placeholder="Ex: 299.90"
                    value={form.valor_mensal}
                    onChange={(e) =>
                      alterar("valor_mensal", e.target.value)
                    }
                  />
                </div>

                {/* Dia de cobrança */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Dia de Cobrança{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input input-bordered w-full"
                    placeholder="1 a 31"
                    value={form.dia_cobranca}
                    onChange={(e) =>
                      alterar("dia_cobranca", e.target.value)
                    }
                  />
                </div>

                {/* Tipo de cobrança */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Tipo de Cobrança
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.tipo_cobranca}
                    onChange={(e) =>
                      alterar("tipo_cobranca", e.target.value)
                    }
                  >
                    {TIPOS_COBRANCA.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Status do Plano
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.status_plano}
                    onChange={(e) =>
                      alterar("status_plano", e.target.value)
                    }
                  >
                    {STATUS_PLANO.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Forma de pagamento */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Forma de Pagamento
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={form.forma_pagamento}
                    onChange={(e) =>
                      alterar("forma_pagamento", e.target.value)
                    }
                  >
                    <option value="">Selecione</option>

                    {FORMAS_PAGAMENTO.map((forma) => (
                      <option key={forma} value={forma}>
                        {forma}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data de início */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Data de Início
                    </span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.data_inicio}
                    onChange={(e) =>
                      alterar("data_inicio", e.target.value)
                    }
                  />
                </div>

                {/* Próximo vencimento */}

                {form.status_plano !== "Cancelado" && (
                  <div>
                    <label className="label">
                      <span className="label-text">
                        Próximo Vencimento
                      </span>
                    </label>

                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.proximo_vencimento}
                      onChange={(e) =>
                        alterar(
                          "proximo_vencimento",
                          e.target.value
                        )
                      }
                    />

                    <p className="text-xs text-base-content/60 mt-1">
                      Deixe vazio para calcular automaticamente
                      pelo dia de cobrança.
                    </p>
                  </div>
                )}

                {/* Cancelamento */}

                {form.status_plano === "Cancelado" && (
                  <>
                    <div>
                      <label className="label">
                        <span className="label-text">
                          Data do Cancelamento
                        </span>
                      </label>

                      <input
                        type="date"
                        className="input input-bordered w-full"
                        value={form.data_cancelamento}
                        onChange={(e) =>
                          alterar(
                            "data_cancelamento",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">
                        <span className="label-text">
                          Motivo do Cancelamento{" "}
                          <span className="text-error">*</span>
                        </span>
                      </label>

                      <input
                        className="input input-bordered w-full"
                        maxLength={150}
                        placeholder="Informe o motivo"
                        value={form.motivo_cancelamento}
                        onChange={(e) =>
                          alterar(
                            "motivo_cancelamento",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </>
                )}

                {/* Observações */}

                <div className="md:col-span-2">
                  <label className="label">
                    <span className="label-text">
                      Observações
                    </span>
                  </label>

                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="Observações sobre o plano..."
                    value={form.observacoes}
                    onChange={(e) =>
                      alterar("observacoes", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* AÇÕES */}

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

            <div
              className="modal-backdrop"
              onClick={() => !salvando && fecharModal()}
            />
          </div>
        )}
      </div>
    </div>
  );
}