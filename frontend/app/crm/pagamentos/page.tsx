"use client";
import { useEffect, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

// Interface Pagamento
interface Pagamento {
  id: number;
  cliente_id: number;
  cliente_nome?: string; // puxado da tabela clientes
  projeto_id?: number;
  valor: number;
  data_vencimento?: string;
  data_pagamento?: string;
  status_pagamento: "pendente" | "pago" | "atrasado";
  created_at?: string;
}

export default function PagamentosPage() {
  const [registros, setRegistros] = useState<Pagamento[]>([]);
  const [novo, setNovo] = useState<Partial<Pagamento>>({});
  const [editando, setEditando] = useState<Pagamento | null>(null);

  useEffect(() => { carregar(); }, []);

  const carregar = () => {
    api.get("/pagamentos/").then(res => setRegistros(res.data));
  };

  const criar = () => {
    api.post("/pagamentos/", novo).then(() => {
      setNovo({});
      carregar();
    });
  };

  const atualizar = () => {
    if (!editando) return;
    api.put(`/pagamentos/${editando.id}`, editando).then(() => {
      setEditando(null);
      carregar();
    });
  };

  const deletar = (id: number) => {
    api.delete(`/pagamentos/${id}`).then(() => carregar());
  };

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">Pagamentos</h2>

        {/* Formulário de criação */}
        <div className="card bg-base-200 p-4 mb-6">
          <h3 className="text-xl font-semibold mb-2">Adicionar Pagamento</h3>

          <div className="grid grid-cols-2 gap-4">

            {/* Cliente */}
            <div>
              <label className="label">
                <span className="label-text">Cliente ID</span>
              </label>
              <input
                className="input input-bordered w-full"
                placeholder="Digite o ID do cliente"
                value={novo.cliente_id || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    cliente_id: Number(e.target.value)
                  })
                }
              />
            </div>

            {/* Projeto */}
            <div>
              <label className="label">
                <span className="label-text">Projeto ID</span>
              </label>
              <input
                className="input input-bordered w-full"
                placeholder="Digite o ID do projeto"
                value={novo.projeto_id || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    projeto_id: Number(e.target.value)
                  })
                }
              />
            </div>

            {/* Valor */}
            <div>
              <label className="label">
                <span className="label-text">Valor</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="number"
                placeholder="Digite o valor"
                value={novo.valor || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    valor: Number(e.target.value)
                  })
                }
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="label">
                <span className="label-text">Data de Vencimento</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="date"
                value={novo.data_vencimento || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    data_vencimento: e.target.value
                  })
                }
              />
            </div>

            {/* Data de Pagamento */}
            <div>
              <label className="label">
                <span className="label-text">Data de Pagamento</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="date"
                value={novo.data_pagamento || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    data_pagamento: e.target.value
                  })
                }
              />
            </div>

            {/* Status */}
            <div>
              <label className="label">
                <span className="label-text">Status do Pagamento</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={novo.status_pagamento || "pendente"}
                onChange={e =>
                  setNovo({
                    ...novo,
                    status_pagamento:
                      e.target.value as Pagamento["status_pagamento"]
                  })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
              </select>
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

        {/* Tabela de registros */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Data Pagamento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.cliente_nome} (ID: {r.cliente_id})</td>
                  <td>{r.projeto_id}</td>
                  <td>{r.valor}</td>
                  <td>{r.data_vencimento}</td>
                  <td>{r.data_pagamento}</td>
                  <td>{r.status_pagamento}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-warning btn-xs" onClick={() => setEditando(r)}>Editar</button>
                    <button className="btn btn-error btn-xs" onClick={() => deletar(r.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de edição */}
        {editando && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Editar Pagamento</h3>

              <div className="flex flex-col gap-4 mt-4">

                {/* Valor */}
                <div>
                  <label className="label">
                    <span className="label-text">Valor</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    type="number"
                    placeholder="Digite o valor"
                    value={editando.valor}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        valor: Number(e.target.value)
                      })
                    }
                  />
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="label">
                    <span className="label-text">Data de Vencimento</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    type="date"
                    value={editando.data_vencimento || ""}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        data_vencimento: e.target.value
                      })
                    }
                  />
                </div>

                {/* Data de Pagamento */}
                <div>
                  <label className="label">
                    <span className="label-text">Data de Pagamento</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    type="date"
                    value={editando.data_pagamento || ""}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        data_pagamento: e.target.value
                      })
                    }
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="label">
                    <span className="label-text">Status do Pagamento</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.status_pagamento}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        status_pagamento:
                          e.target.value as Pagamento["status_pagamento"]
                      })
                    }
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>

              </div>

              <div className="modal-action">
                <button
                  className="btn btn-primary"
                  onClick={atualizar}
                >
                  Salvar
                </button>

                <button
                  className="btn"
                  onClick={() => setEditando(null)}
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












