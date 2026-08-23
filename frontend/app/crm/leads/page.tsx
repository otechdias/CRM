"use client";

import { useEffect, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

interface Lead {
  id: number;
  nome_empresa: string | null;
  nome_contato: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  status_lead: string | null;
  nivel_interesse: string | null;
  responsavel: string | null;
  ramo: string | null;
  abordado: string | null;
  site: string | null;
  created_at: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [novo, setNovo] = useState<Partial<Lead>>({});
  const [editando, setEditando] = useState<Lead | null>(null);

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
  // BADGES
  // =========================

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "novo":
        return "badge badge-info";

      case "em andamento":
        return "badge badge-warning";

      case "perdido":
        return "badge badge-error";

      case "convertido":
        return "badge badge-success";

      default:
        return "badge";
    }
  };

  const getInteresseBadgeClass = (nivel?: string | null) => {
    switch (nivel) {
      case "baixo":
        return "badge badge-secondary";

      case "medio":
        return "badge badge-primary";

      case "alto":
        return "badge badge-success";

      default:
        return "badge";
    }
  };

  // =========================
  // CARREGAR LEADS
  // =========================

  const carregar = () => {
    api
      .get("/leads/")
      .then((res) => {
        setLeads(res.data);
      })
      .catch((error) => {
        console.error("Erro ao carregar leads:", error);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  // =========================
  // CRIAR LEAD
  // =========================

  const criar = () => {
    api
      .post("/leads/", novo)
      .then(() => {
        setNovo({});
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao criar lead:", error);
      });
  };

  // =========================
  // ABRIR MODAL DE EDIÇÃO
  // =========================

  const iniciarEdicao = (lead: Lead) => {
    setEditando({
      ...lead,

      nome_empresa: lead.nome_empresa ?? "",
      nome_contato: lead.nome_contato ?? "",
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      cidade: lead.cidade ?? "",
      status_lead: lead.status_lead ?? "novo",
      nivel_interesse: lead.nivel_interesse ?? "",
      responsavel: lead.responsavel ?? "",
      ramo: lead.ramo ?? "",
      abordado: lead.abordado ?? "Não",
      site: lead.site ?? "Não",
    });
  };

  // =========================
  // ATUALIZAR LEAD
  // =========================

  const atualizar = () => {
    if (!editando) return;

    api
      .put(`/leads/${editando.id}`, editando)
      .then(() => {
        setEditando(null);
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao atualizar lead:", error);
      });
  };

  // =========================
  // DELETAR LEAD
  // =========================

  const deletar = (id: number) => {
    api
      .delete(`/leads/${id}`)
      .then(() => {
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao deletar lead:", error);
      });
  };

  return (
    <div>
      <Navbar />

      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">Leads</h2>

        {/* ========================= */}
        {/* FORMULÁRIO DE CRIAÇÃO */}
        {/* ========================= */}

        <div className="card bg-base-200 p-4 mb-6">
          <h3 className="text-xl font-semibold mb-2">
            Adicionar Lead
          </h3>

          <div className="grid grid-cols-2 gap-4">

            {/* Empresa */}
            <div>
              <label className="label">
                <span className="label-text">Empresa</span>
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
                <span className="label-text">Nome do Contato</span>
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
                <span className="label-text">Telefone</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o telefone"
                value={novo.telefone || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    telefone: formatarTelefone(e.target.value),
                  })
                }
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="label">
                <span className="label-text">E-mail</span>
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
                <span className="label-text">Cidade</span>
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

            {/* Ramo */}
            <div>
              <label className="label">
                <span className="label-text">Ramo</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o ramo da empresa"
                value={novo.ramo || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    ramo: e.target.value,
                  })
                }
              />
            </div>

            {/* Abordado */}
            <div>
              <label className="label">
                <span className="label-text">Abordado?</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.abordado || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    abordado: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Selecione uma opção
                </option>

                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {/* Site */}
            <div>
              <label className="label">
                <span className="label-text">Tem Site?</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.site || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    site: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Selecione uma opção
                </option>

                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="label">
                <span className="label-text">Status do Lead</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.status_lead || "novo"}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    status_lead: e.target.value,
                  })
                }
              >
                <option value="novo">Novo</option>

                <option value="em andamento">
                  Em andamento
                </option>

                <option value="perdido">
                  Perdido
                </option>

                <option value="convertido">
                  Convertido
                </option>
              </select>
            </div>

            {/* Nível de Interesse */}
            <div>
              <label className="label">
                <span className="label-text">
                  Nível de Interesse
                </span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.nivel_interesse || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    nivel_interesse: e.target.value,
                  })
                }
              >
                <option value="">
                  Selecione o nível de interesse
                </option>

                <option value="baixo">Baixo</option>
                <option value="medio">Médio</option>
                <option value="alto">Alto</option>
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label className="label">
                <span className="label-text">Responsável</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o responsável"
                value={novo.responsavel || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    responsavel: e.target.value,
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
                <th>Ramo</th>
                <th>Abordado?</th>
                <th>Site?</th>
                <th>Status</th>
                <th>Interesse</th>
                <th>Responsável</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.id || ""}</td>

                  <td>{l.nome_empresa || ""}</td>

                  <td>{l.nome_contato || ""}</td>

                  <td>
                    {l.telefone
                      ? formatarTelefone(l.telefone)
                      : ""}
                  </td>

                  <td>{l.email || ""}</td>

                  <td>{l.cidade || ""}</td>

                  <td>{l.ramo || ""}</td>

                  <td>{l.abordado || ""}</td>

                  <td>{l.site || ""}</td>

                  <td>
                    <span
                      className={getStatusBadgeClass(
                        l.status_lead
                      )}
                    >
                      {l.status_lead
                        ? l.status_lead
                            .charAt(0)
                            .toUpperCase() +
                          l.status_lead.slice(1)
                        : ""}
                    </span>
                  </td>

                  <td>
                    <span
                      className={getInteresseBadgeClass(
                        l.nivel_interesse
                      )}
                    >
                      {l.nivel_interesse
                        ? l.nivel_interesse
                            .charAt(0)
                            .toUpperCase() +
                          l.nivel_interesse.slice(1)
                        : ""}
                    </span>
                  </td>

                  <td>{l.responsavel || ""}</td>

                  <td className="flex gap-2">
                    <button
                      className="btn btn-warning btn-xs"
                      onClick={() => iniciarEdicao(l)}
                    >
                      Editar
                    </button>

                    <button
                      className="btn btn-error btn-xs"
                      onClick={() => deletar(l.id)}
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
                Editar Lead
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
                    value={editando.nome_empresa ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
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
                    value={editando.nome_contato ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
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
                    value={editando.telefone ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
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
                    value={editando.email ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
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
                    value={editando.cidade ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        cidade: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Ramo */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Ramo
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o ramo da empresa"
                    value={editando.ramo ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        ramo: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Abordado */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Abordado?
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.abordado ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        abordado: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    <option value="Sim">
                      Sim
                    </option>

                    <option value="Não">
                      Não
                    </option>
                  </select>
                </div>

                {/* Site */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Tem Site?
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.site ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        site: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    <option value="Sim">
                      Sim
                    </option>

                    <option value="Não">
                      Não
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Status do Lead
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={editando.status_lead ?? ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          status_lead: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Selecione
                      </option>

                      <option value="novo">
                        Novo
                      </option>

                      <option value="em andamento">
                        Em andamento
                      </option>

                      <option value="perdido">
                        Perdido
                      </option>

                      <option value="convertido">
                        Convertido
                      </option>
                    </select>

                    <span
                      className={getStatusBadgeClass(
                        editando.status_lead
                      )}
                    >
                      {(editando.status_lead ?? "")
                        .charAt(0)
                        .toUpperCase() +
                        (editando.status_lead ?? "").slice(1)}
                    </span>
                  </div>
                </div>

                {/* Nível de Interesse */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Nível de Interesse
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={
                        editando.nivel_interesse ?? ""
                      }
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          nivel_interesse: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Selecione o interesse
                      </option>

                      <option value="baixo">
                        Baixo
                      </option>

                      <option value="medio">
                        Médio
                      </option>

                      <option value="alto">
                        Alto
                      </option>
                    </select>

                    <span
                      className={getInteresseBadgeClass(
                        editando.nivel_interesse
                      )}
                    >
                      {(editando.nivel_interesse ?? "")
                        .charAt(0)
                        .toUpperCase() +
                        (editando.nivel_interesse ?? "").slice(
                          1
                        )}
                    </span>
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Responsável
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o responsável"
                    value={editando.responsavel ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        responsavel: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              {/* Ações */}
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