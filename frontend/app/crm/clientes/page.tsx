"use client";

import { useEffect, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

interface Cliente {
  id: number;
  nome_empresa: string;
  nome_contato: string;
  telefone: string;
  email: string;
  cidade: string;
  status_cliente: string;
  data_conversao: string;
  valor_medio: number;
  created_at: string;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [novo, setNovo] = useState<Partial<Cliente>>({});
  const [editando, setEditando] = useState<Cliente | null>(null);

  // =========================
  // MÁSCARA DE TELEFONE
  // =========================

  const formatarTelefone = (valor?: string | null) => {
    if (!valor) return "";

    let numeros = valor.replace(/\D/g, "");

    if (!numeros.startsWith("55")) {
      numeros = "55" + numeros;
    }

    numeros = numeros.slice(0, 13);

    if (numeros.length >= 12) {
      return `+55 ${numeros.slice(2, 4)} ${numeros.slice(
        4,
        9
      )}-${numeros.slice(9, 13)}`;
    }

    return "+55 " + numeros.slice(2);
  };

  // =========================
  // STATUS
  // =========================

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ativo":
        return "badge badge-success";

      case "inativo":
        return "badge badge-error";

      default:
        return "badge";
    }
  };

  // =========================
  // CARREGAR CLIENTES
  // =========================

  const carregar = () => {
    api
      .get("/clientes/")
      .then((res) => setClientes(res.data))
      .catch((error) => {
        console.error("Erro ao carregar clientes:", error);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  // =========================
  // CRIAR CLIENTE
  // =========================

  const criar = () => {
    api
      .post("/clientes/", novo)
      .then(() => {
        setNovo({});
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao criar cliente:", error);
      });
  };

  // =========================
  // ATUALIZAR CLIENTE
  // =========================

  const atualizar = () => {
    if (!editando) return;

    api
      .put(`/clientes/${editando.id}`, editando)
      .then(() => {
        setEditando(null);
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao atualizar cliente:", error);
      });
  };

  // =========================
  // DELETAR CLIENTE
  // =========================

  const deletar = (id: number) => {
    api
      .delete(`/clientes/${id}`)
      .then(() => {
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao deletar cliente:", error);
      });
  };

  return (
    <div>
      <Navbar />

      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">
          Clientes
        </h2>

        {/* ========================= */}
        {/* FORMULÁRIO DE CRIAÇÃO */}
        {/* ========================= */}

        <div className="card bg-base-200 p-4 mb-6">
          <h3 className="text-xl font-semibold mb-2">
            Adicionar Cliente
          </h3>

          <div className="grid grid-cols-2 gap-4">

            {/* Empresa */}
            <div>
              <label className="label">
                <span className="label-text">
                  Empresa
                </span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o nome da empresa"
                value={novo.nome_empresa || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    nome_empresa: e.target.value,
                  })
                }
              />
            </div>

            {/* Contato */}
            <div>
              <label className="label">
                <span className="label-text">
                  Nome do Contato
                </span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o nome do contato"
                value={novo.nome_contato || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    nome_contato: e.target.value,
                  })
                }
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="label">
                <span className="label-text">
                  Telefone
                </span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o telefone"
                value={novo.telefone || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    telefone: formatarTelefone(
                      e.target.value
                    ),
                  })
                }
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="label">
                <span className="label-text">
                  E-mail
                </span>
              </label>

              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="Digite o e-mail"
                value={novo.email || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    email: e.target.value,
                  })
                }
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="label">
                <span className="label-text">
                  Cidade
                </span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite a cidade"
                value={novo.cidade || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    cidade: e.target.value,
                  })
                }
              />
            </div>

            {/* Status */}
            <div>
              <label className="label">
                <span className="label-text">
                  Status do Cliente
                </span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.status_cliente || "ativo"}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    status_cliente: e.target.value,
                  })
                }
              >
                <option value="ativo">
                  Ativo
                </option>

                <option value="inativo">
                  Inativo
                </option>
              </select>
            </div>

            {/* Data de Conversão */}
            <div>
              <label className="label">
                <span className="label-text">
                  Data de Conversão
                </span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_conversao || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    data_conversao: e.target.value,
                  })
                }
              />
            </div>

            {/* Valor Médio */}
            <div>
              <label className="label">
                <span className="label-text">
                  Valor Médio
                </span>
              </label>

              <input
                type="number"
                className="input input-bordered w-full"
                placeholder="Digite o valor médio"
                value={novo.valor_medio || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    valor_medio: Number(
                      e.target.value
                    ),
                  })
                }
              />
            </div>

            {/* Botão */}
            <button
              className="btn btn-primary col-span-2"
              onClick={criar}
            >
              Salvar
            </button>

          </div>
        </div>

        {/* ========================= */}
        {/* TABELA */}
        {/* ========================= */}

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Cidade</th>
                <th>Status</th>
                <th>Conversão</th>
                <th>Valor Médio</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>

                  <td>{c.nome_empresa}</td>

                  <td>{c.nome_contato}</td>

                  <td>
                    {formatarTelefone(c.telefone)}
                  </td>

                  <td>{c.email}</td>

                  <td>{c.cidade}</td>

                  <td>
                    <span
                      className={getStatusBadgeClass(
                        c.status_cliente
                      )}
                    >
                      {c.status_cliente
                        .charAt(0)
                        .toUpperCase() +
                        c.status_cliente.slice(1)}
                    </span>
                  </td>

                  <td>
                    {c.data_conversao}
                  </td>

                  <td>
                    {c.valor_medio}
                  </td>

                  <td className="flex gap-2">
                    <button
                      className="btn btn-warning btn-xs"
                      onClick={() =>
                        setEditando(c)
                      }
                    >
                      Editar
                    </button>

                    <button
                      className="btn btn-error btn-xs"
                      onClick={() =>
                        deletar(c.id)
                      }
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ========================= */}
        {/* MODAL DE EDIÇÃO */}
        {/* ========================= */}

        {editando && (
          <div className="modal modal-open">
            <div className="modal-box">

              <h3 className="font-bold text-lg">
                Editar Cliente
              </h3>

              <div className="flex flex-col gap-4 mt-4">

                {/* Empresa */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Empresa
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o nome da empresa"
                    value={editando.nome_empresa}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nome_empresa:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Contato */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Nome do Contato
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o nome do contato"
                    value={editando.nome_contato}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nome_contato:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Telefone
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o telefone"
                    value={editando.telefone}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        telefone:
                          formatarTelefone(
                            e.target.value
                          ),
                      })
                    }
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      E-mail
                    </span>
                  </label>

                  <input
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="Digite o e-mail"
                    value={editando.email}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        email:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Cidade
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite a cidade"
                    value={editando.cidade}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        cidade:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Status do Cliente
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={
                        editando.status_cliente
                      }
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          status_cliente:
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
                    </select>

                    <span
                      className={getStatusBadgeClass(
                        editando.status_cliente
                      )}
                    >
                      {editando.status_cliente
                        .charAt(0)
                        .toUpperCase() +
                        editando.status_cliente.slice(
                          1
                        )}
                    </span>
                  </div>
                </div>

                {/* Data de Conversão */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Data de Conversão
                    </span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={
                      editando.data_conversao || ""
                    }
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_conversao:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* Valor Médio */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Valor Médio
                    </span>
                  </label>

                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="Digite o valor médio"
                    value={
                      editando.valor_medio
                    }
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        valor_medio: Number(
                          e.target.value
                        ),
                      })
                    }
                  />
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