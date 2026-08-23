"use client";
import { useEffect, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

interface Cliente {
  id: number;
  nome_empresa: string;
}

interface Projeto {
  id: number;
  cliente_id: number;
  nome_projeto: string;
  status_projeto: string;
  data_inicio: string;
  data_previsao: string;
  data_entrega: string;
  valor_projeto: number;
}

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [novo, setNovo] = useState<Partial<Projeto>>({});
  const [editando, setEditando] = useState<Projeto | null>(null);

  useEffect(() => {
    carregarProjetos();
    carregarClientes();
  }, []);

  const carregarProjetos = () => {
    api.get("/projetos/").then(res => setProjetos(res.data));
  };

  const carregarClientes = () => {
    api.get("/clientes/").then(res => setClientes(res.data));
  };

  const criar = () => {
    api.post("/projetos/", novo).then(() => {
      setNovo({});
      carregarProjetos();
    });
  };

  const atualizar = () => {
    if (!editando) return;
    api.put(`/projetos/${editando.id}`, editando).then(() => {
      setEditando(null);
      carregarProjetos();
    });
  };

  const deletar = (id: number) => {
    api.delete(`/projetos/${id}`).then(() => carregarProjetos());
  };

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">Projetos</h2>

        {/* Formulário de criação */}
        <div className="card bg-base-200 p-4 mb-6">
          <h3 className="text-xl font-semibold mb-2">Adicionar Projeto</h3>

          <div className="grid grid-cols-2 gap-4">

            {/* Cliente */}
            <div>
              <label className="label">
                <span className="label-text">Cliente</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.cliente_id || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    cliente_id: Number(e.target.value)
                  })
                }
              >
                <option value="">Selecione o cliente</option>

                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome_empresa}
                  </option>
                ))}
              </select>
            </div>

            {/* Nome do Projeto */}
            <div>
              <label className="label">
                <span className="label-text">Nome do Projeto</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o nome do projeto"
                value={novo.nome_projeto || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    nome_projeto: e.target.value
                  })
                }
              />
            </div>

            {/* Status */}
            <div>
              <label className="label">
                <span className="label-text">Status do Projeto</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.status_projeto || "briefing"}
                onChange={e =>
                  setNovo({
                    ...novo,
                    status_projeto: e.target.value
                  })
                }
              >
                <option value="briefing">Briefing</option>
                <option value="em andamento">Em andamento</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Data de Início */}
            <div>
              <label className="label">
                <span className="label-text">Data de Início</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_inicio || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    data_inicio: e.target.value
                  })
                }
              />
            </div>

            {/* Data de Previsão */}
            <div>
              <label className="label">
                <span className="label-text">Data de Previsão</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_previsao || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    data_previsao: e.target.value
                  })
                }
              />
            </div>

            {/* Data de Entrega */}
            <div>
              <label className="label">
                <span className="label-text">Data de Entrega</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_entrega || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    data_entrega: e.target.value
                  })
                }
              />
            </div>

            {/* Valor */}
            <div>
              <label className="label">
                <span className="label-text">Valor do Projeto</span>
              </label>

              <input
                type="number"
                className="input input-bordered w-full"
                placeholder="Digite o valor"
                value={novo.valor_projeto || ""}
                onChange={e =>
                  setNovo({
                    ...novo,
                    valor_projeto: Number(e.target.value)
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

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>Datas</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {projetos.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{clientes.find(c => c.id === p.cliente_id)?.nome_empresa}</td>
                  <td>{p.nome_projeto}</td>
                  <td>{p.status_projeto}</td>
                  <td>{p.data_inicio} → {p.data_previsao} → {p.data_entrega}</td>
                  <td>{p.valor_projeto}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-warning btn-xs" onClick={() => setEditando(p)}>Editar</button>
                    <button className="btn btn-error btn-xs" onClick={() => deletar(p.id)}>Excluir</button>
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
              <h3 className="font-bold text-lg">Editar Projeto</h3>
              {/* Campos iguais ao formulário de criação */}
              <div className="flex flex-col gap-2 mt-4">

                {/* Cliente */}
                <div>
                  <label className="label">
                    <span className="label-text">Cliente</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.cliente_id}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        cliente_id: Number(e.target.value)
                      })
                    }
                  >
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome_empresa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome do Projeto */}
                <div>
                  <label className="label">
                    <span className="label-text">Nome do Projeto</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o nome do projeto"
                    value={editando.nome_projeto}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        nome_projeto: e.target.value
                      })
                    }
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="label">
                    <span className="label-text">Status do Projeto</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.status_projeto}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        status_projeto: e.target.value
                      })
                    }
                  >
                    <option value="briefing">Briefing</option>
                    <option value="em andamento">Em andamento</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Data de Início */}
                <div>
                  <label className="label">
                    <span className="label-text">Data de Início</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_inicio || ""}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        data_inicio: e.target.value
                      })
                    }
                  />
                </div>

                {/* Data de Previsão */}
                <div>
                  <label className="label">
                    <span className="label-text">Data de Previsão</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_previsao || ""}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        data_previsao: e.target.value
                      })
                    }
                  />
                </div>

                {/* Data de Entrega */}
                <div>
                  <label className="label">
                    <span className="label-text">Data de Entrega</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_entrega || ""}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        data_entrega: e.target.value
                      })
                    }
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="label">
                    <span className="label-text">Valor do Projeto</span>
                  </label>

                  <input
                    type="number"
                    className="input input-bordered w-full"
                    placeholder="Digite o valor"
                    value={editando.valor_projeto}
                    onChange={e =>
                      setEditando({
                        ...editando,
                        valor_projeto: Number(e.target.value)
                      })
                    }
                  />
                </div>

              </div>
              <div className="modal-action">
                <button className="btn btn-primary" onClick={atualizar}>Salvar</button>
                <button className="btn" onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
