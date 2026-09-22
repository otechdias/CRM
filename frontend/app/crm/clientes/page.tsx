// FRONTEND/CLIENTES
"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

interface Cliente {
  id: number;
  nome_empresa: string;
  nome_contato?: string | null;
  telefone?: string | null;
  email?: string | null;
  cidade?: string | null;
  ramo?: string | null;
  link_site?: string | null;
  status_cliente?: string | null;
  tipo_cliente?: string | null;
  origem_cliente?: string | null;
  data_conversao?: string | null;
  valor_medio?: number | null;
  ultimo_contato?: string | null;
  proximo_contato?: string | null;
  motivo_inativacao?: string | null;
  observacoes?: string | null;
  lead_id?: number | null;
  created_at?: string | null;
}

interface ClienteForm {
  nome_empresa: string;
  nome_contato: string;
  telefone: string;
  email: string;
  cidade: string;
  ramo: string;
  link_site: string;
  status_cliente: string;
  tipo_cliente: string;
  origem_cliente: string;
  data_conversao: string;
  valor_medio: string;
  ultimo_contato: string;
  proximo_contato: string;
  motivo_inativacao: string;
  observacoes: string;
}

interface LeadItem {
  id: number;
  nome_empresa: string | null;
  nome_contato: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  ramo: string | null;
  origem_lead: string | null;
  status_lead: string | null;
  cliente_id: number | null;
}

const STATUS_CLIENTE = [
  "Ativo",
  "Inativo",
  "Pausado",
  "Em negociação",
];

const TIPOS_CLIENTE = [
  "Cliente de Projeto",
  "Cliente Recorrente",
  "Projeto + Recorrência",
  "Cliente Avulso",
  "Cliente Antigo",
];

const RAMOS = [
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

const ORIGENS = [
  "Prospecção ativa",
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Google",
  "Google Maps",
  "Site TechDias",
  "Facebook",
  "LinkedIn",
  "Evento",
  "Networking",
  "Cliente antigo",
  "Parceiro",
  "Outro",
];

const FORM_VAZIO: ClienteForm = {
  nome_empresa: "",
  nome_contato: "",
  telefone: "",
  email: "",
  cidade: "",
  ramo: "",
  link_site: "",
  status_cliente: "Ativo",
  tipo_cliente: "",
  origem_cliente: "",
  data_conversao: "",
  valor_medio: "",
  ultimo_contato: "",
  proximo_contato: "",
  motivo_inativacao: "",
  observacoes: "",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string>("");
  const [novo, setNovo] = useState<ClienteForm>(FORM_VAZIO);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  // Leads disponíveis para virar cliente:
  // - que ainda não estão vinculados a um cliente (cliente_id vazio)
  // - que não estão perdidos
  // Leads "Ex-Cliente" aparecem aqui e podem ser convertidos de novo.
  const leadsDisponiveis = useMemo(() => {
    return leads.filter(
      (lead) =>
        !lead.cliente_id && lead.status_lead !== "Perdido"
    );
  }, [leads]);

  // ============================================================
  // MÁSCARA DE TELEFONE
  // ============================================================

  const formatarTelefone = (valor?: string | null) => {
    if (!valor) return "";

    let numeros = valor.replace(/\D/g, "");

    if (!numeros.startsWith("55")) {
      numeros = "55" + numeros;
    }

    numeros = numeros.slice(0, 13);

    if (numeros.length >= 13) {
      return `+55 ${numeros.slice(2, 4)} ${numeros.slice(
        4,
        9
      )}-${numeros.slice(9, 13)}`;
    }

    if (numeros.length >= 12) {
      return `+55 ${numeros.slice(2, 4)} ${numeros.slice(
        4,
        8
      )}-${numeros.slice(8, 12)}`;
    }

    return "+55 " + numeros.slice(2);
  };

  // ============================================================
  // VALIDAÇÃO DE E-MAIL
  // ============================================================

  const emailValido = (email: string) => {
    if (!email.trim()) return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // ============================================================
  // VALIDAÇÃO DE SITE
  // ============================================================

  const siteValido = (site: string) => {
    if (!site.trim()) return true;

    try {
      new URL(site.trim());
      return true;
    } catch {
      return false;
    }
  };

  // ============================================================
  // VALIDAÇÃO DE TELEFONE
  // ============================================================

  const telefoneValido = (telefone: string) => {
    if (!telefone.trim()) return true;

    const numeros = telefone.replace(/\D/g, "");

    return numeros.length === 12 || numeros.length === 13;
  };

  // ============================================================
  // VALIDAÇÃO DO CLIENTE
  // ============================================================

  const validarCliente = (dados: ClienteForm | Cliente) => {
    if (!dados.nome_empresa?.trim()) {
      alert("Informe o nome da empresa.");
      return false;
    }

    if (dados.email && !emailValido(dados.email)) {
      alert("Informe um endereço de e-mail válido.");
      return false;
    }

    if (dados.link_site && !siteValido(dados.link_site)) {
      alert(
        "Informe uma URL válida para o site.\nExemplo: https://www.exemplo.com.br"
      );
      return false;
    }

    if (dados.telefone && !telefoneValido(dados.telefone)) {
      alert("Informe um telefone válido com DDD.");
      return false;
    }

    if (
      dados.valor_medio !== null &&
      dados.valor_medio !== undefined &&
      dados.valor_medio !== ""
    ) {
      const valor = Number(dados.valor_medio);

      if (Number.isNaN(valor)) {
        alert("Informe um valor médio válido.");
        return false;
      }

      if (valor < 0) {
        alert("O valor médio não pode ser negativo.");
        return false;
      }
    }

    if (
      dados.status_cliente === "Inativo" &&
      !dados.motivo_inativacao?.trim()
    ) {
      alert(
        "Informe o motivo da inativação para um cliente Inativo."
      );
      return false;
    }

    return true;
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "Ativo":
        return "badge badge-success";

      case "Inativo":
        return "badge badge-error";

      case "Pausado":
        return "badge badge-warning";

      case "Em negociação":
        return "badge badge-info";

      default:
        return "badge";
    }
  };

  // ============================================================
  // CARREGAR CLIENTES E LEADS
  // ============================================================

  const carregar = async () => {
    try {
      setCarregando(true);

      const [resClientes, resLeads] = await Promise.all([
        api.get("/clientes/"),
        api.get("/leads/").catch(() => ({ data: [] })),
      ]);

      setClientes(resClientes.data);
      setLeads(resLeads.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Não foi possível carregar os clientes.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((cliente) => {
      if (filtroStatus && cliente.status_cliente !== filtroStatus) return false;
      const data = (cliente.proximo_contato || cliente.ultimo_contato || cliente.data_conversao || cliente.created_at || "").slice(0, 10);
      if (filtroDataDe && (!data || data < filtroDataDe)) return false;
      if (filtroDataAte && (!data || data > filtroDataAte)) return false;
      if (!termo) return true;
      return [cliente.id, cliente.nome_empresa, cliente.nome_contato, cliente.telefone, cliente.email, cliente.cidade, cliente.ramo, cliente.tipo_cliente, cliente.origem_cliente].filter(Boolean).join(" ").toLowerCase().includes(termo);
    });
  }, [clientes, busca, filtroStatus, filtroDataDe, filtroDataAte]);

  const temFiltro = Boolean(busca || filtroStatus || filtroDataDe || filtroDataAte);
  const limparFiltros = () => { setBusca(""); setFiltroStatus(""); setFiltroDataDe(""); setFiltroDataAte(""); };

  // ============================================================
  // SELECIONAR E AUTO-PREENCHER LEAD
  // ============================================================

  const selecionarLead = (leadIdStr: string) => {
    setLeadSelecionadoId(leadIdStr);

    if (!leadIdStr) return;

    const lead = leads.find((item) => item.id === Number(leadIdStr));
    if (!lead) return;

    const hoje = new Date().toISOString().split("T")[0];

    setNovo((anterior) => ({
      ...anterior,
      nome_empresa: lead.nome_empresa || anterior.nome_empresa,
      nome_contato: lead.nome_contato || anterior.nome_contato,
      telefone: lead.telefone
        ? formatarTelefone(lead.telefone)
        : anterior.telefone,
      email: lead.email || anterior.email,
      cidade: lead.cidade || anterior.cidade,
      ramo: lead.ramo || anterior.ramo,
      origem_cliente: lead.origem_lead || anterior.origem_cliente,
      data_conversao: anterior.data_conversao || hoje,
    }));
  };

  // ============================================================
  // ALTERAR FORMULÁRIO
  // ============================================================

  const alterarNovo = (campo: keyof ClienteForm, valor: string) => {
    setNovo((anterior) => {
      const atualizado = {
        ...anterior,
        [campo]: valor,
      };

      // Se deixar de ser Inativo, remove o motivo.
      if (campo === "status_cliente" && valor !== "Inativo") {
        atualizado.motivo_inativacao = "";
      }

      return atualizado;
    });
  };

  // ============================================================
  // CRIAR CLIENTE
  // ============================================================

  const criar = async () => {
    if (!validarCliente(novo)) {
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        ...novo,
        lead_id: leadSelecionadoId ? Number(leadSelecionadoId) : null,
        valor_medio:
          novo.valor_medio === "" ? null : Number(novo.valor_medio),
        data_conversao:
          novo.data_conversao ||
          new Date().toISOString().split("T")[0],
      };

      await api.post("/clientes/", payload);

      const veioDeLead = !!leadSelecionadoId;

      setNovo({ ...FORM_VAZIO });
      setLeadSelecionadoId("");

      await carregar();

      alert(
        veioDeLead
          ? "Cliente criado com sucesso! O lead foi convertido e ficou como Convertido / Fechado."
          : "Cliente criado com sucesso!"
      );
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);

      const mensagem =
        error?.response?.data?.erro ||
        "Não foi possível criar o cliente.";

      alert(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  // ============================================================
  // ABRIR EDIÇÃO
  // ============================================================

  const abrirEdicao = (cliente: Cliente) => {
    setEditando({
      ...cliente,
      nome_empresa: cliente.nome_empresa || "",
      nome_contato: cliente.nome_contato || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cidade: cliente.cidade || "",
      ramo: cliente.ramo || "",
      link_site: cliente.link_site || "",
      status_cliente: cliente.status_cliente || "Ativo",
      tipo_cliente: cliente.tipo_cliente || "",
      origem_cliente: cliente.origem_cliente || "",
      data_conversao: cliente.data_conversao || "",
      valor_medio: cliente.valor_medio ?? null,
      ultimo_contato: cliente.ultimo_contato || "",
      proximo_contato: cliente.proximo_contato || "",
      motivo_inativacao: cliente.motivo_inativacao || "",
      observacoes: cliente.observacoes || "",
    });
  };

  // ============================================================
  // ATUALIZAR CLIENTE
  // ============================================================

  const atualizar = async () => {
    if (!editando) return;

    if (!validarCliente(editando)) {
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        nome_empresa: editando.nome_empresa,
        nome_contato: editando.nome_contato || null,
        telefone: editando.telefone || null,
        email: editando.email || null,
        cidade: editando.cidade || null,
        ramo: editando.ramo || null,
        link_site: editando.link_site || null,
        status_cliente: editando.status_cliente || "Ativo",
        tipo_cliente: editando.tipo_cliente || null,
        origem_cliente: editando.origem_cliente || null,
        data_conversao: editando.data_conversao || null,
        valor_medio: editando.valor_medio ?? null,
        ultimo_contato: editando.ultimo_contato || null,
        proximo_contato: editando.proximo_contato || null,
        motivo_inativacao: editando.motivo_inativacao || null,
        observacoes: editando.observacoes || null,
      };

      await api.put(`/clientes/${editando.id}`, payload);

      setEditando(null);

      await carregar();

      alert("Cliente atualizado com sucesso.");
    } catch (error: any) {
      console.error("Erro ao atualizar cliente:", error);

      const mensagem =
        error?.response?.data?.erro ||
        "Não foi possível atualizar o cliente.";

      alert(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  // ============================================================
  // DELETAR CLIENTE
  // ============================================================

  const deletar = async (id: number) => {
    const cliente = clientes.find((item) => item.id === id);

    const avisoLead = cliente?.lead_id
      ? `\n\nO lead de origem continuará em Leads com status Ex-Cliente.`
      : "";

    const confirmado = window.confirm(
      `Tem certeza que deseja excluir o cliente "${
        cliente?.nome_empresa || id
      }"?\n\nSerão apagados também os projetos, pagamentos e planos recorrentes deste cliente.${avisoLead}\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    try {
      setExcluindoId(id);

      await api.delete(`/clientes/${id}`);

      // Recarrega clientes e leads: o lead de origem mudou de status
      await carregar();

      alert("Cliente excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro ao deletar cliente:", error);

      const mensagem =
        error?.response?.data?.erro ||
        "Não foi possível excluir o cliente.";

      alert(mensagem);
    } finally {
      setExcluindoId(null);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      <Navbar />

      <div className="p-6">
        {/* CABEÇALHO */}

        <div className="mb-6">
          <h2 className="text-3xl font-bold">Clientes</h2>

          <p className="text-base-content/60 mt-1">
            Gerencie seus clientes, informações comerciais e
            acompanhamento.
          </p>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}

        <div className="card bg-base-200 p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">
            Adicionar Cliente
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Importar de Lead */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-base-300/40 p-4 rounded-lg border border-base-300">
              <label className="label py-0 pb-1">
                <span className="label-text font-semibold text-primary">
                  Vincular / Importar Lead (Opcional)
                </span>
              </label>

              <select
                className="select select-bordered w-full"
                value={leadSelecionadoId}
                onChange={(e) => selecionarLead(e.target.value)}
              >
                <option value="">
                  -- Selecione um Lead em aberto para converter em
                  Cliente --
                </option>

                {leadsDisponiveis.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.nome_empresa || `Lead #${lead.id}`}{" "}
                    {lead.nome_contato
                      ? `(${lead.nome_contato})`
                      : ""}{" "}
                    - Status: {lead.status_lead || "Novo"}
                  </option>
                ))}
              </select>

              <p className="text-xs text-base-content/60 mt-1">
                Ao selecionar um lead, os dados serão preenchidos
                automaticamente e o lead ficará como Convertido, etapa
                Fechado.
              </p>
            </div>

            {/* Empresa */}

            <div>
              <label className="label">
                <span className="label-text">Empresa *</span>
              </label>

              <input
                required
                className="input input-bordered w-full"
                placeholder="Nome da empresa"
                value={novo.nome_empresa}
                onChange={(e) =>
                  alterarNovo("nome_empresa", e.target.value)
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
                placeholder="Nome do responsável"
                value={novo.nome_contato}
                onChange={(e) =>
                  alterarNovo("nome_contato", e.target.value)
                }
              />
            </div>

            {/* Telefone */}

            <div>
              <label className="label">
                <span className="label-text">Telefone</span>
              </label>

              <input
                type="tel"
                className="input input-bordered w-full"
                placeholder="+55 21 99999-9999"
                value={novo.telefone}
                onChange={(e) =>
                  alterarNovo(
                    "telefone",
                    formatarTelefone(e.target.value)
                  )
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
                placeholder="email@empresa.com"
                value={novo.email}
                onChange={(e) =>
                  alterarNovo("email", e.target.value)
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
                placeholder="Cidade"
                value={novo.cidade}
                onChange={(e) =>
                  alterarNovo("cidade", e.target.value)
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
                value={novo.ramo}
                onChange={(e) =>
                  alterarNovo("ramo", e.target.value)
                }
              >
                <option value="">Selecione o ramo</option>

                {RAMOS.map((ramo) => (
                  <option key={ramo} value={ramo}>
                    {ramo}
                  </option>
                ))}
              </select>
            </div>

            {/* Site */}

            <div>
              <label className="label">
                <span className="label-text">Site</span>
              </label>

              <input
                type="url"
                className="input input-bordered w-full"
                placeholder="https://..."
                value={novo.link_site}
                onChange={(e) =>
                  alterarNovo("link_site", e.target.value)
                }
              />
            </div>

            {/* Status */}

            <div>
              <label className="label">
                <span className="label-text">Status *</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.status_cliente}
                onChange={(e) =>
                  alterarNovo("status_cliente", e.target.value)
                }
              >
                {STATUS_CLIENTE.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}

            <div>
              <label className="label">
                <span className="label-text">Tipo de Cliente</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.tipo_cliente}
                onChange={(e) =>
                  alterarNovo("tipo_cliente", e.target.value)
                }
              >
                <option value="">Selecione o tipo</option>

                {TIPOS_CLIENTE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Origem */}

            <div>
              <label className="label">
                <span className="label-text">Origem</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.origem_cliente}
                onChange={(e) =>
                  alterarNovo("origem_cliente", e.target.value)
                }
              >
                <option value="">Selecione a origem</option>

                {ORIGENS.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </div>

            {/* Data de Conversão */}

            <div>
              <label className="label">
                <span className="label-text">Data de Conversão</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_conversao}
                onChange={(e) =>
                  alterarNovo("data_conversao", e.target.value)
                }
              />
            </div>

            {/* Valor Médio */}

            <div>
              <label className="label">
                <span className="label-text">Valor Médio</span>
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered w-full"
                placeholder="0,00"
                value={novo.valor_medio}
                onChange={(e) =>
                  alterarNovo("valor_medio", e.target.value)
                }
              />
            </div>

            {/* Último Contato */}

            <div>
              <label className="label">
                <span className="label-text">Último Contato</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.ultimo_contato}
                onChange={(e) =>
                  alterarNovo("ultimo_contato", e.target.value)
                }
              />
            </div>

            {/* Próximo Contato */}

            <div>
              <label className="label">
                <span className="label-text">Próximo Contato</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.proximo_contato}
                onChange={(e) =>
                  alterarNovo("proximo_contato", e.target.value)
                }
              />
            </div>

            {/* Motivo Inativação */}

            {novo.status_cliente === "Inativo" && (
              <div>
                <label className="label">
                  <span className="label-text">
                    Motivo da Inativação *
                  </span>
                </label>

                <input
                  required
                  className="input input-bordered w-full"
                  placeholder="Informe o motivo"
                  value={novo.motivo_inativacao}
                  onChange={(e) =>
                    alterarNovo("motivo_inativacao", e.target.value)
                  }
                />
              </div>
            )}

            {/* Observações */}

            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">
                <span className="label-text">Observações</span>
              </label>

              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Observações sobre o cliente..."
                rows={3}
                value={novo.observacoes}
                onChange={(e) =>
                  alterarNovo("observacoes", e.target.value)
                }
              />
            </div>

            {/* Botão */}

            <div className="md:col-span-2 lg:col-span-3">
              <button
                className="btn btn-primary w-full"
                onClick={criar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>
          </div>
        </div>

        {/* TABELA */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <input className="input input-bordered md:col-span-2" placeholder="Pesquisar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="select select-bordered" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_CLIENTE.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <input type="date" className="input input-bordered" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} title="Data inicial" />
          <input type="date" className="input input-bordered" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} title="Data final" />
          <button className="btn btn-outline" onClick={limparFiltros} disabled={!temFiltro}>Limpar filtros</button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Cidade</th>
                <th>Ramo</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Valor Médio</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={10} className="text-center">
                    Carregando clientes...
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10">{temFiltro ? "Nenhum cliente encontrado com esses filtros." : "Nenhum cliente cadastrado."}</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.id}</td>

                    <td className="font-medium">
                      {cliente.nome_empresa}
                    </td>

                    <td>{cliente.nome_contato || "-"}</td>

                    <td>
                      {formatarTelefone(cliente.telefone) || "-"}
                    </td>

                    <td>{cliente.cidade || "-"}</td>

                    <td>{cliente.ramo || "-"}</td>

                    <td>
                      <span
                        className={getStatusBadgeClass(
                          cliente.status_cliente
                        )}
                      >
                        {cliente.status_cliente || "-"}
                      </span>
                    </td>

                    <td>{cliente.tipo_cliente || "-"}</td>

                    <td>
                      {cliente.valor_medio !== null &&
                      cliente.valor_medio !== undefined
                        ? cliente.valor_medio.toLocaleString(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            }
                          )
                        : "-"}
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => abrirEdicao(cliente)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => deletar(cliente.id)}
                          disabled={excluindoId === cliente.id}
                        >
                          {excluindoId === cliente.id
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

        {/* MODAL DE EDIÇÃO */}

        {editando && (
          <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
              <h3 className="font-bold text-xl">Editar Cliente</h3>

              <p className="text-sm text-base-content/60 mt-1">
                Atualize as informações do cliente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {/* Empresa */}

                <div>
                  <label className="label">
                    <span className="label-text">Empresa *</span>
                  </label>

                  <input
                    required
                    className="input input-bordered w-full"
                    value={editando.nome_empresa || ""}
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
                    value={editando.nome_contato || ""}
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
                    type="tel"
                    className="input input-bordered w-full"
                    value={editando.telefone || ""}
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
                    value={editando.email || ""}
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
                    value={editando.cidade || ""}
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
                    value={editando.ramo || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        ramo: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o ramo</option>

                    {RAMOS.map((ramo) => (
                      <option key={ramo} value={ramo}>
                        {ramo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Site */}

                <div>
                  <label className="label">
                    <span className="label-text">Site</span>
                  </label>

                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={editando.link_site || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        link_site: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Status */}

                <div>
                  <label className="label">
                    <span className="label-text">Status *</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.status_cliente || "Ativo"}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        status_cliente: e.target.value,
                        motivo_inativacao:
                          e.target.value === "Inativo"
                            ? editando.motivo_inativacao || ""
                            : "",
                      })
                    }
                  >
                    {STATUS_CLIENTE.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Tipo de Cliente
                    </span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.tipo_cliente || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        tipo_cliente: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione o tipo</option>

                    {TIPOS_CLIENTE.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origem */}

                <div>
                  <label className="label">
                    <span className="label-text">Origem</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.origem_cliente || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        origem_cliente: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione a origem</option>

                    {ORIGENS.map((origem) => (
                      <option key={origem} value={origem}>
                        {origem}
                      </option>
                    ))}
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
                    value={editando.data_conversao || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_conversao: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Valor Médio */}

                <div>
                  <label className="label">
                    <span className="label-text">Valor Médio</span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input input-bordered w-full"
                    value={editando.valor_medio ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        valor_medio:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Último Contato */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Último Contato
                    </span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.ultimo_contato || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        ultimo_contato: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Próximo Contato */}

                <div>
                  <label className="label">
                    <span className="label-text">
                      Próximo Contato
                    </span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.proximo_contato || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        proximo_contato: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Motivo Inativação */}

                {editando.status_cliente === "Inativo" && (
                  <div>
                    <label className="label">
                      <span className="label-text">
                        Motivo da Inativação *
                      </span>
                    </label>

                    <input
                      required
                      className="input input-bordered w-full"
                      value={editando.motivo_inativacao || ""}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          motivo_inativacao: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* Observações */}

                <div className="md:col-span-2">
                  <label className="label">
                    <span className="label-text">Observações</span>
                  </label>

                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={4}
                    value={editando.observacoes || ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        observacoes: e.target.value,
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
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar Alterações"}
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
          </div>
        )}
      </div>
    </div>
  );
}