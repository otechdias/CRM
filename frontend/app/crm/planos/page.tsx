"use client";

import { useEffect, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

interface Plano {
  id: number;
  cliente_id: number;
  nome_plano: string;
  valor_mensal: number;
  status_plano: string;
}

interface Cliente {
  id: number;
  nome_empresa: string;
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [novo, setNovo] = useState<Partial<Plano>>({});
  const [editando, setEditando] = useState<Plano | null>(null);

  const [modalAdicionar, setModalAdicionar] = useState(false);

  const [carregando, setCarregando] = useState(false);

  // =========================
  // FORMATAÇÃO DE VALOR
  // =========================

  const formatarMoeda = (valor?: number | null) => {
    if (valor === null || valor === undefined) {
      return "R$ 0,00";
    }

    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // =========================
  // BADGE DE STATUS
  // =========================

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "ativo":
        return "badge badge-success";

      case "inativo":
        return "badge badge-error";

      case "pausado":
        return "badge badge-warning";

      default:
        return "badge";
    }
  };

  // =========================
  // NOME DO CLIENTE
  // =========================

  const getNomeCliente = (clienteId: number) => {
    const cliente = clientes.find(
      (c) => c.id === clienteId
    );

    return cliente?.nome_empresa || `ID: ${clienteId}`;
  };

  // =========================
  // CARREGAR PLANOS
  // =========================

  const carregarPlanos = () => {
    setCarregando(true);

    api
      .get("/planos/")
      .then((res) => {
        setPlanos(res.data);
      })
      .catch((error) => {
        console.error(
          "Erro ao carregar planos:",
          error
        );
      })
      .finally(() => {
        setCarregando(false);
      });
  };

  // =========================
  // CARREGAR CLIENTES
  // =========================

  const carregarClientes = () => {
    api
      .get("/clientes/")
      .then((res) => {
        setClientes(res.data);
      })
      .catch((error) => {
        console.error(
          "Erro ao carregar clientes:",
          error
        );
      });
  };

  // =========================
  // CARREGAMENTO INICIAL
  // =========================

  useEffect(() => {
    carregarPlanos();
    carregarClientes();
  }, []);

  // =========================
  // ABRIR MODAL ADICIONAR
  // =========================

  const abrirModalAdicionar = () => {
    setNovo({
      cliente_id: undefined,
      nome_plano: "",
      valor_mensal: 0,
      status_plano: "ativo",
    });

    setModalAdicionar(true);
  };

  // =========================
  // FECHAR MODAL ADICIONAR
  // =========================

  const fecharModalAdicionar = () => {
    setModalAdicionar(false);
    setNovo({});
  };

  // =========================
  // CRIAR PLANO
  // =========================

  const criar = () => {
    if (!novo.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }

    if (!novo.nome_plano?.trim()) {
      alert("Selecione o nome do plano.");
      return;
    }

    if (
      novo.valor_mensal === undefined ||
      novo.valor_mensal === null
    ) {
      alert("Informe o valor mensal.");
      return;
    }

    api
      .post("/planos/", novo)
      .then(() => {
        fecharModalAdicionar();
        carregarPlanos();
      })
      .catch((error) => {
        console.error(
          "Erro ao criar plano:",
          error
        );

        alert(
          "Não foi possível criar o plano."
        );
      });
  };

  // =========================
  // ABRIR EDIÇÃO
  // =========================

  const iniciarEdicao = (plano: Plano) => {
    setEditando({
      ...plano,
    });
  };

  // =========================
  // ATUALIZAR PLANO
  // =========================

  const atualizar = () => {
    if (!editando) return;

    if (!editando.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }

    if (!editando.nome_plano.trim()) {
      alert("Selecione o nome do plano.");
      return;
    }

    api
      .put(`/planos/${editando.id}`, editando)
      .then(() => {
        setEditando(null);
        carregarPlanos();
      })
      .catch((error) => {
        console.error(
          "Erro ao atualizar plano:",
          error
        );

        alert(
          "Não foi possível atualizar o plano."
        );
      });
  };

  // =========================
  // DELETAR PLANO
  // =========================

  const deletar = (id: number) => {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este plano?"
    );

    if (!confirmar) return;

    api
      .delete(`/planos/${id}`)
      .then(() => {
        carregarPlanos();
      })
      .catch((error) => {
        console.error(
          "Erro ao excluir plano:",
          error
        );

        alert(
          "Não foi possível excluir o plano."
        );
      });
  };

  return (
    <div>
      <Navbar />

      <div className="p-6">

        {/* ========================= */}
        {/* CABEÇALHO */}
        {/* ========================= */}

        <div className="flex items-center justify-between mb-6">
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
            onClick={abrirModalAdicionar}
          >
            + Adicionar Plano
          </button>
        </div>

        {/* ========================= */}
        {/* TABELA */}
        {/* ========================= */}

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">

            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Plano</th>
                <th>Valor Mensal</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>

              {carregando ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8"
                  >
                    Carregando planos...
                  </td>
                </tr>
              ) : planos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8"
                  >
                    Nenhum plano cadastrado.
                  </td>
                </tr>
              ) : (
                planos.map((p) => (
                  <tr key={p.id}>

                    <td>
                      {p.id}
                    </td>

                    <td>
                      {getNomeCliente(
                        p.cliente_id
                      )}
                    </td>

                    <td>
                      {p.nome_plano}
                    </td>

                    <td>
                      {formatarMoeda(
                        p.valor_mensal
                      )}
                    </td>

                    <td>
                      <span
                        className={getStatusBadgeClass(
                          p.status_plano
                        )}
                      >
                        {p.status_plano
                          ? p.status_plano
                              .charAt(0)
                              .toUpperCase() +
                            p.status_plano.slice(1)
                          : ""}
                      </span>
                    </td>

                    <td>
                      <div className="flex gap-2">

                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() =>
                            iniciarEdicao(p)
                          }
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          onClick={() =>
                            deletar(p.id)
                          }
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

        {/* ========================= */}
        {/* MODAL - ADICIONAR PLANO */}
        {/* ========================= */}

        {modalAdicionar && (
          <div className="modal modal-open">

            <div className="modal-box">

              <h3 className="font-bold text-lg">
                Adicionar Plano
              </h3>

              <div className="flex flex-col gap-4 mt-4">

                {/* Cliente */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Cliente
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={
                      novo.cliente_id || ""
                    }
                    onChange={(e) =>
                      setNovo({
                        ...novo,
                        cliente_id:
                          Number(
                            e.target.value
                          ),
                      })
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

                {/* Nome do Plano */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Nome do Plano
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={
                      novo.nome_plano || ""
                    }
                    onChange={(e) =>
                      setNovo({
                        ...novo,
                        nome_plano:
                          e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Selecione o plano
                    </option>

                    <option value="Plano Essencial">
                      Plano Essencial
                    </option>

                    <option value="Plano Pro">
                      Plano Pro
                    </option>

                    <option value="Plano Pro Max">
                      Plano Pro Max
                    </option>
                  </select>
                </div>

                {/* Valor Mensal */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Valor Mensal
                    </span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full"
                    placeholder="Ex: 299.90"
                    value={
                      novo.valor_mensal ?? ""
                    }
                    onChange={(e) =>
                      setNovo({
                        ...novo,
                        valor_mensal:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                  />
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
                    value={
                      novo.status_plano ||
                      "ativo"
                    }
                    onChange={(e) =>
                      setNovo({
                        ...novo,
                        status_plano:
                          e.target.value,
                      })
                    }
                  >
                    <option value="ativo">
                      Ativo
                    </option>

                    <option value="inativo">
                      Inativo
                    </option>

                    <option value="pausado">
                      Pausado
                    </option>
                  </select>
                </div>

              </div>

              {/* AÇÕES */}

              <div className="modal-action">

                <button
                  className="btn btn-primary"
                  onClick={criar}
                >
                  Salvar
                </button>

                <button
                  className="btn"
                  onClick={
                    fecharModalAdicionar
                  }
                >
                  Cancelar
                </button>

              </div>

            </div>

          </div>
        )}

        {/* ========================= */}
        {/* MODAL - EDITAR PLANO */}
        {/* ========================= */}

        {editando && (
          <div className="modal modal-open">

            <div className="modal-box">

              <h3 className="font-bold text-lg">
                Editar Plano
              </h3>

              <div className="flex flex-col gap-4 mt-4">

                {/* Cliente */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Cliente
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={
                      editando.cliente_id
                    }
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        cliente_id:
                          Number(
                            e.target.value
                          ),
                      })
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

                {/* Nome do Plano */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Nome do Plano
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={
                      editando.nome_plano
                    }
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nome_plano:
                          e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Selecione o plano
                    </option>

                    <option value="Plano Essencial">
                      Plano Essencial
                    </option>

                    <option value="Plano Pro">
                      Plano Pro
                    </option>

                    <option value="Plano Pro Max">
                      Plano Pro Max
                    </option>
                  </select>
                </div>

                {/* Valor Mensal */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Valor Mensal
                    </span>
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full"
                    value={
                      editando.valor_mensal
                    }
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        valor_mensal:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                  />
                </div>

                {/* Status */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Status do Plano
                    </span>
                  </label>

                  <div className="flex items-center gap-2">

                    <select
                      className="select select-bordered flex-1"
                      value={
                        editando.status_plano
                      }
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          status_plano:
                            e.target.value,
                        })
                      }
                    >
                      <option value="ativo">
                        Ativo
                      </option>

                      <option value="inativo">
                        Inativo
                      </option>

                      <option value="pausado">
                        Pausado
                      </option>
                    </select>

                    <span
                      className={getStatusBadgeClass(
                        editando.status_plano
                      )}
                    >
                      {editando.status_plano
                        ? editando.status_plano
                            .charAt(0)
                            .toUpperCase() +
                          editando.status_plano.slice(
                            1
                          )
                        : ""}
                    </span>

                  </div>
                </div>

              </div>

              {/* AÇÕES */}

              <div className="modal-action">

                <button
                  className="btn btn-primary"
                  onClick={atualizar}
                >
                  Salvar
                </button>

                <button
                  className="btn"
                  onClick={() =>
                    setEditando(null)
                  }
                >
                  Cancelar
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}