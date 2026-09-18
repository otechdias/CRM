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
  ramo: string | null;
  ramo_personalizado: string | null;
  abordado: string | null;
  site: string | null;
  presenca_digital: string[] | null;
  tipo_primeiro_contato: string | null;
  origem_lead: string | null;
  responsavel: string | null;
  status_lead: string | null;
  etapa_comercial: string | null;
  nivel_interesse: string | null;
  potencial_valor: string | null;
  tipo_site: string | null;
  objetivo_site: string[] | null;
  prazo_interesse: string | null;
  decisor: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  horario_proxima_acao: string | null;
  prioridade: string | null;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  data_conversao: string | null;
  motivo_perda: string | null;
  motivo_perda_personalizado: string | null;
  observacoes: string | null;
  created_at: string | null;
}

const MOTIVOS_PERDA_OPCOES = [
  "Preço",
  "Sem orçamento",
  "Sem interesse",
  "Projeto adiado",
  "Escolheu concorrente",
  "Já possui fornecedor",
  "Não respondeu",
  "Contato inválido",
  "Empresa encerrou atividades",
  "Projeto cancelado",
  "Prazo incompatível",
  "Condições de pagamento",
  "Não conseguimos contato",
  "Outro",
];

const RAMOS_OPCOES = [
  "Academia",
  "Advocacia",
  "Agronegócio",
  "Arquitetura",
  "Autoescola",
  "Automotivo",
  "Barbearia",
  "Beleza",
  "Clínica",
  "Contabilidade",
  "Construção",
  "Consultoria",
  "Dentista",
  "Educação",
  "Engenharia",
  "Eventos",
  "Farmácia",
  "Fotografia",
  "Hotelaria",
  "Imobiliária",
  "Indústria",
  "Informática/Tecnologia",
  "Marketing",
  "Oficina Mecânica",
  "Pet Shop",
  "Restaurante",
  "Salão de Beleza",
  "Saúde",
  "Serviços",
  "Turismo",
  "Varejo",
  "Veículos",
  "Outro",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [novo, setNovo] = useState<Partial<Lead>>({
    abordado: "Não",
    site: "Não",
    status_lead: "Novo",
  });
  const [editando, setEditando] = useState<Lead | null>(null);
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);

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
    switch (status?.toLowerCase()) {
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
    switch (nivel?.toLowerCase()) {
      case "baixo":
        return "badge badge-secondary";

      case "medio":
      case "médio":
        return "badge badge-primary";

      case "alto":
        return "badge badge-success";

      case "muito alto":
        return "badge badge-accent";

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
    setErroCriacao(null);

    api
      .post("/leads/", novo)
      .then(() => {
        setNovo({
          abordado: "Não",
          site: "Não",
          status_lead: "Novo",
        });
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao criar lead:", error);
        const msg =
          error.response?.data?.erro ||
          error.response?.data?.detalhes ||
          "Erro ao criar lead. Verifique os dados.";
        setErroCriacao(msg);
      });
  };

  // =========================
  // ABRIR MODAL DE EDIÇÃO
  // =========================

  const iniciarEdicao = (lead: Lead) => {
    setErroModal(null);
    setEditando({
      ...lead,
      nome_empresa: lead.nome_empresa ?? "",
      nome_contato: lead.nome_contato ?? "",
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      cidade: lead.cidade ?? "",
      status_lead: lead.status_lead ?? "Novo",
      nivel_interesse: lead.nivel_interesse ?? "",
      responsavel: lead.responsavel ?? "",
      ramo: lead.ramo ?? "",
      ramo_personalizado: lead.ramo_personalizado ?? "",
      abordado: lead.abordado ?? "Não",
      site: lead.site ?? "Não",
      motivo_perda: lead.motivo_perda ?? "",
      motivo_perda_personalizado: lead.motivo_perda_personalizado ?? "",
    });
  };

  // =========================
  // ATUALIZAR LEAD
  // =========================

  const atualizar = () => {
    if (!editando) return;
    setErroModal(null);

    api
      .put(`/leads/${editando.id}`, editando)
      .then(() => {
        setEditando(null);
        carregar();
      })
      .catch((error) => {
        console.error("Erro ao atualizar lead:", error);
        const msg =
          error.response?.data?.erro ||
          error.response?.data?.detalhes ||
          "Erro ao atualizar lead. Verifique os dados.";
        setErroModal(msg);
      });
  };

  // =========================
  // DELETAR LEAD
  // =========================

  const deletar = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

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
          <h3 className="text-xl font-semibold mb-2">Adicionar Lead</h3>

          {erroCriacao && (
            <div className="alert alert-error mb-4">
              <span>{erroCriacao}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Empresa */}
            <div>
              <label className="label">
                <span className="label-text">
                  Empresa <span className="text-error">*</span>
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

              <select
                className="select select-bordered w-full"
                value={novo.ramo || ""}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    ramo: e.target.value,
                  })
                }
              >
                <option value="">Selecione o ramo</option>
                {RAMOS_OPCOES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Ramo Personalizado (se Outro) */}
            {novo.ramo === "Outro" && (
              <div className="col-span-2">
                <label className="label">
                  <span className="label-text">
                    Especifique o Ramo <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  className="input input-bordered w-full"
                  placeholder="Digite o ramo personalizado"
                  value={novo.ramo_personalizado || ""}
                  onChange={(e) =>
                    setNovo({
                      ...novo,
                      ramo_personalizado: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* Abordado */}
            <div>
              <label className="label">
                <span className="label-text">Abordado?</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.abordado || "Não"}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    abordado: e.target.value,
                  })
                }
              >
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
                value={novo.site || "Não"}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    site: e.target.value,
                  })
                }
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
                <option value="Em desenvolvimento">Em desenvolvimento</option>
                <option value="Desatualizado">Desatualizado</option>
                <option value="Com problemas">Com problemas</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="label">
                <span className="label-text">Status do Lead</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.status_lead || "Novo"}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    status_lead: e.target.value,
                  })
                }
              >
                <option value="Novo">Novo</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Perdido">Perdido</option>
                <option value="Convertido">Convertido</option>
              </select>
            </div>

            {/* Nível de Interesse */}
            <div>
              <label className="label">
                <span className="label-text">Nível de Interesse</span>
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
                <option value="">Selecione o nível de interesse</option>
                <option value="Baixo">Baixo</option>
                <option value="Médio">Médio</option>
                <option value="Alto">Alto</option>
                <option value="Muito Alto">Muito Alto</option>
              </select>
            </div>

            {/* Responsável */}
            <div className={novo.status_lead === "Perdido" ? "" : "col-span-2"}>
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

            {/* Motivo Perda (se Perdido) */}
            {novo.status_lead === "Perdido" && (
              <div>
                <label className="label">
                  <span className="label-text">
                    Motivo da Perda <span className="text-error">*</span>
                  </span>
                </label>

                <select
                  className="select select-bordered w-full"
                  value={novo.motivo_perda || ""}
                  onChange={(e) =>
                    setNovo({
                      ...novo,
                      motivo_perda: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione o motivo da perda</option>
                  {MOTIVOS_PERDA_OPCOES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {novo.status_lead === "Perdido" && novo.motivo_perda === "Outro" && (
              <div className="col-span-2">
                <label className="label">
                  <span className="label-text">
                    Especifique o Motivo da Perda{" "}
                    <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  className="input input-bordered w-full"
                  placeholder="Digite o motivo detalhado"
                  value={novo.motivo_perda_personalizado || ""}
                  onChange={(e) =>
                    setNovo({
                      ...novo,
                      motivo_perda_personalizado: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* Botão */}
            <button
              className="btn btn-primary col-span-2 mt-2"
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
                  <td>{l.id}</td>
                  <td>{l.nome_empresa || ""}</td>
                  <td>{l.nome_contato || ""}</td>
                  <td>{l.telefone ? formatarTelefone(l.telefone) : ""}</td>
                  <td>{l.email || ""}</td>
                  <td>{l.cidade || ""}</td>
                  <td>{l.ramo || ""}</td>
                  <td>{l.abordado || ""}</td>
                  <td>{l.site || ""}</td>

                  <td>
                    <span className={getStatusBadgeClass(l.status_lead)}>
                      {l.status_lead || ""}
                    </span>
                  </td>

                  <td>
                    {l.nivel_interesse ? (
                      <span
                        className={getInteresseBadgeClass(l.nivel_interesse)}
                      >
                        {l.nivel_interesse}
                      </span>
                    ) : (
                      "-"
                    )}
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
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-lg">Editar Lead #{editando.id}</h3>

              {erroModal && (
                <div className="alert alert-error my-3">
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Empresa */}
                <div className="col-span-2">
                  <label className="label">
                    <span className="label-text">
                      Empresa <span className="text-error">*</span>
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
                    <span className="label-text">Nome do Contato</span>
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
                    <span className="label-text">Telefone</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    placeholder="Digite o telefone"
                    value={editando.telefone ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
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
                    <span className="label-text">Cidade</span>
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
                    <span className="label-text">Ramo</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.ramo ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        ramo: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o ramo</option>
                    {RAMOS_OPCOES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ramo Personalizado (se Outro) */}
                {editando.ramo === "Outro" && (
                  <div className="col-span-2">
                    <label className="label">
                      <span className="label-text">
                        Especifique o Ramo <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      className="input input-bordered w-full"
                      placeholder="Digite o ramo personalizado"
                      value={editando.ramo_personalizado ?? ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          ramo_personalizado: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* Abordado */}
                <div>
                  <label className="label">
                    <span className="label-text">Abordado?</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.abordado ?? "Não"}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        abordado: e.target.value,
                      })
                    }
                  >
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
                    value={editando.site ?? "Não"}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        site: e.target.value,
                      })
                    }
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                    <option value="Em desenvolvimento">
                      Em desenvolvimento
                    </option>
                    <option value="Desatualizado">Desatualizado</option>
                    <option value="Com problemas">Com problemas</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="label">
                    <span className="label-text">Status do Lead</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={editando.status_lead ?? "Novo"}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          status_lead: e.target.value,
                        })
                      }
                    >
                      <option value="Novo">Novo</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Perdido">Perdido</option>
                      <option value="Convertido">Convertido</option>
                    </select>

                    <span className={getStatusBadgeClass(editando.status_lead)}>
                      {editando.status_lead || ""}
                    </span>
                  </div>
                </div>

                {/* Nível de Interesse */}
                <div>
                  <label className="label">
                    <span className="label-text">Nível de Interesse</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={editando.nivel_interesse ?? ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          nivel_interesse: e.target.value,
                        })
                      }
                    >
                      <option value="">Sem interesse definido</option>
                      <option value="Baixo">Baixo</option>
                      <option value="Médio">Médio</option>
                      <option value="Alto">Alto</option>
                      <option value="Muito Alto">Muito Alto</option>
                    </select>

                    {editando.nivel_interesse && (
                      <span
                        className={getInteresseBadgeClass(
                          editando.nivel_interesse
                        )}
                      >
                        {editando.nivel_interesse}
                      </span>
                    )}
                  </div>
                </div>

                {/* Responsável */}
                <div
                  className={
                    editando.status_lead === "Perdido" ? "" : "col-span-2"
                  }
                >
                  <label className="label">
                    <span className="label-text">Responsável</span>
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

                {/* Motivo Perda (se Perdido) */}
                {editando.status_lead === "Perdido" && (
                  <div>
                    <label className="label">
                      <span className="label-text">
                        Motivo da Perda <span className="text-error">*</span>
                      </span>
                    </label>

                    <select
                      className="select select-bordered w-full"
                      value={editando.motivo_perda ?? ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          motivo_perda: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione o motivo da perda</option>
                      {MOTIVOS_PERDA_OPCOES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editando.status_lead === "Perdido" &&
                  editando.motivo_perda === "Outro" && (
                    <div className="col-span-2">
                      <label className="label">
                        <span className="label-text">
                          Especifique o Motivo da Perda{" "}
                          <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        className="input input-bordered w-full"
                        placeholder="Digite o motivo detalhado"
                        value={editando.motivo_perda_personalizado ?? ""}
                        onChange={(e) =>
                          setEditando({
                            ...editando,
                            motivo_perda_personalizado: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
              </div>

              {/* Ações */}
              <div className="modal-action">
                <button className="btn btn-primary" onClick={atualizar}>
                  Salvar
                </button>

                <button className="btn" onClick={() => setEditando(null)}>
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