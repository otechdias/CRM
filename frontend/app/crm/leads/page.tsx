"use client";

import { useEffect, useMemo, useState } from "react";
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

  presenca_digital: string[] | null;

  site: string | null;
  abordado: string | null;

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

  cliente_id: number | null;

  created_at: string | null;
}

/* =========================================================
   OPÇÕES DO BANCO / BACKEND
========================================================= */

const RAMOS_OPCOES = [
  "Academia", "Advocacia", "Agronegócio", "Arquitetura", "Autoescola",
  "Automotivo", "Barbearia", "Beleza", "Clínica", "Contabilidade",
  "Construção", "Consultoria", "Dentista", "Educação", "Engenharia",
  "Eventos", "Farmácia", "Fotografia", "Hotelaria", "Imobiliária",
  "Indústria", "Informática/Tecnologia", "Marketing", "Oficina Mecânica",
  "Pet Shop", "Restaurante", "Salão de Beleza", "Saúde", "Serviços",
  "Turismo", "Varejo", "Veículos", "Outro",
];

const PRESENCA_DIGITAL_OPCOES = [
  "Instagram", "Facebook", "TikTok", "LinkedIn", "Google",
  "WhatsApp Business", "Site", "E-commerce", "Nenhuma",
];

const TEM_SITE_OPCOES = [
  "Não", "Sim", "Em desenvolvimento", "Desatualizado", "Com problemas",
];

const TIPOS_PRIMEIRO_CONTATO = [
  "WhatsApp", "Ligação", "Instagram", "E-mail", "Indicação",
  "Site", "Presencial", "Outro",
];

const ORIGENS_LEAD = [
  "Prospecção ativa", "Instagram", "WhatsApp", "Indicação", "Google",
  "Google Maps", "Site TechDias", "Facebook", "LinkedIn", "Evento",
  "Networking", "Cliente antigo", "Parceiro", "Outro",
];

const STATUS_LEAD = ["Novo", "Em andamento", "Perdido", "Convertido", "Ex-Cliente"];

const STATUS_AUTOMATICOS = ["Convertido", "Ex-Cliente"];

const ETAPAS_COMERCIAIS = [
  "Novo Lead", "Primeiro Contato", "Aguardando Resposta", "Respondeu",
  "Qualificação", "Qualificado", "Briefing Pendente", "Briefing Agendado",
  "Briefing Realizado", "Proposta em Preparação", "Orçamento Enviado",
  "Aguardando Retorno do Orçamento", "Negociação", "Aguardando Decisão",
  "Aprovado Verbalmente", "Contrato Enviado", "Contrato Assinado",
  "Aguardando Pagamento", "Fechado", "Perdido", "Ex-Cliente",
];

const NIVEIS_INTERESSE = ["Baixo", "Médio", "Alto", "Muito Alto"];

const POTENCIAIS_VALORES = [
  "AtéR$500", "R$500–1.000", "R$1.000–1.500", "R$1.500–2.000", "R$2.000–2.500",
  "R$2.500–3.000", "R$3.000–3.500", "R$3.500–4.000", "R$4.000–4.500",
  "R$4.500–5.000", "R$5.000–5.500", "R$5.500–6.000", "R$6.000–6.500",
  "R$6.500–7.000", "R$7.000–7.500", "R$7.500–8.000", "R$8.000–8.500",
  "R$8.500–9.000", "R$9.000–9.500", "R$9.500–10.000", "R$10.000–11.000",
  "R$11.000–12.000", "R$12.000–13.000", "R$13.000–14.000", "R$14.000–15.000",
  "R$15.000–17.500", "R$17.500–20.000", "R$20.000–25.000", "R$25.000–30.000",
  "R$30.000–40.000", "R$40.000–50.000", "AcimadeR$50.000", "Nãoinformado",
];

const TIPOS_SITE = [
  "Landing Page", "Site Institucional", "Site Profissional", "E-commerce",
  "Catálogo Online", "Portal", "Blog", "Sistema Web", "Área do Cliente",
  "Página de Captura", "Página de Vendas", "Redesign de Site",
  "Otimização de Site Existente", "Manutenção", "Outro", "Não definido",
];

const OBJETIVOS_SITE = [
  "Gerar mais contatos", "Gerar vendas", "Divulgar a empresa",
  "Apresentar serviços", "Apresentar produtos", "Receber pedidos pelo WhatsApp",
  "Melhorar presença digital", "Aumentar credibilidade", "Aparecer no Google",
  "Captar leads", "Vender online", "Permitir agendamentos",
  "Apresentar portfólio", "Melhorar imagem da empresa", "Substituir site antigo",
  "Centralizar informações", "Outro",
];

const PRAZOS_INTERESSE = [
  "Até 7 dias", "15 dias", "30 dias", "1–3 meses", "3–6 meses", "+6 meses", "Sem prazo",
];

const DECISORES = [
  "Proprietário", "Sócio", "Diretor", "Gerente", "Marketing", "TI",
  "Administrativo", "Financeiro", "Outro", "Não informado",
];

const PROXIMAS_ACOES = [
  "Nenhuma", "Fazer primeiro contato", "Fazer follow-up", "Enviar apresentação",
  "Enviar portfólio", "Enviar briefing", "Agendar reunião", "Realizar reunião",
  "Enviar orçamento", "Reenviar orçamento", "Negociar proposta",
  "Aguardar resposta", "Enviar contrato", "Solicitar assinatura",
  "Solicitar pagamento", "Confirmar pagamento", "Solicitar materiais",
  "Entrar em contato novamente", "Fazer pós-venda", "Oferecer plano mensal",
  "Oferecer serviço adicional", "Outro",
];

const PRIORIDADES = ["Baixa", "Normal", "Alta", "Urgente"];

const MOTIVOS_PERDA_OPCOES = [
  "Preço", "Sem orçamento", "Sem interesse", "Projeto adiado",
  "Escolheu concorrente", "Já possui fornecedor", "Não respondeu",
  "Contato inválido", "Empresa encerrou atividades", "Projeto cancelado",
  "Prazo incompatível", "Condições de pagamento", "Não conseguimos contato", "Outro",
];

/* =========================================================
   ESTADO INICIAL
========================================================= */

const estadoInicial: Partial<Lead> = {
  nome_empresa: "",
  nome_contato: "",
  telefone: "",
  email: "",
  cidade: "",

  ramo: "",
  ramo_personalizado: "",

  presenca_digital: [],
  site: "Não",
  abordado: "Não",

  tipo_primeiro_contato: "",
  origem_lead: "",
  responsavel: "",

  status_lead: "Novo",
  etapa_comercial: "Novo Lead",
  nivel_interesse: "",
  potencial_valor: "",

  tipo_site: "",
  objetivo_site: [],
  prazo_interesse: "",
  decisor: "",

  proxima_acao: "",
  data_proxima_acao: "",
  horario_proxima_acao: "",

  prioridade: "Normal",

  data_primeiro_contato: "",
  data_ultimo_contato: "",
  data_conversao: "",

  motivo_perda: "",
  motivo_perda_personalizado: "",

  observacoes: "",
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const [novo, setNovo] = useState<Partial<Lead>>(estadoInicial);
  const [editando, setEditando] = useState<Lead | null>(null);

  const [converterEmCliente, setConverterEmCliente] = useState(false);

  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");

  // NOVOS FILTROS — Ramo e Motivo de Perda (vindos do Dashboard)
  const [filtroRamo, setFiltroRamo] = useState("");
  const [filtroMotivoPerda, setFiltroMotivoPerda] = useState("");

  // Abertura automática do modal de edição via ?editar=ID
  const [leadIdParaAbrir, setLeadIdParaAbrir] = useState<number | null>(null);

  /* =======================================================
     MÁSCARA DE TELEFONE
  ======================================================= */

  const formatarTelefone = (valor?: string | null) => {
    if (!valor) return "";

    let numeros = valor.replace(/\D/g, "");

    if (!numeros.startsWith("55")) {
      numeros = "55" + numeros;
    }

    numeros = numeros.slice(0, 13);

    if (numeros.length >= 12) {
      return `+55 ${numeros.slice(2, 4)} ${numeros.slice(4, 9)}-${numeros.slice(9, 13)}`;
    }

    return "+55 " + numeros.slice(2);
  };

  /* =======================================================
     BADGES
  ======================================================= */

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case "novo": return "badge badge-info";
      case "em andamento": return "badge badge-warning";
      case "perdido": return "badge badge-error";
      case "convertido": return "badge badge-success";
      case "ex-cliente": return "badge badge-neutral";
      default: return "badge";
    }
  };

  const getEtapaBadgeClass = (etapa?: string | null) => {
    switch (etapa?.toLowerCase()) {
      case "novo lead": return "badge badge-info whitespace-nowrap inline-flex items-center justify-center text-center";
      case "primeiro contato": return "badge badge-primary whitespace-nowrap inline-flex items-center justify-center text-center";
      case "aguardando resposta": return "badge badge-warning whitespace-nowrap inline-flex items-center justify-center text-center";
      case "respondeu": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "qualificação": return "badge badge-secondary whitespace-nowrap inline-flex items-center justify-center text-center";
      case "qualificado": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "briefing pendente": return "badge badge-warning whitespace-nowrap inline-flex items-center justify-center text-center";
      case "briefing agendado": return "badge badge-primary whitespace-nowrap inline-flex items-center justify-center text-center";
      case "briefing realizado": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "proposta em preparação": return "badge badge-secondary whitespace-nowrap inline-flex items-center justify-center text-center";
      case "orçamento enviado": return "badge badge-accent whitespace-nowrap inline-flex items-center justify-center text-center";
      case "aguardando retorno do orçamento": return "badge badge-warning whitespace-nowrap inline-flex items-center justify-center text-center";
      case "negociação": return "badge badge-accent whitespace-nowrap inline-flex items-center justify-center text-center";
      case "aguardando decisão": return "badge badge-warning whitespace-nowrap inline-flex items-center justify-center text-center";
      case "aprovado verbalmente": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "contrato enviado": return "badge badge-primary whitespace-nowrap inline-flex items-center justify-center text-center";
      case "contrato assinado": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "aguardando pagamento": return "badge badge-warning whitespace-nowrap inline-flex items-center justify-center text-center";
      case "fechado": return "badge badge-success whitespace-nowrap inline-flex items-center justify-center text-center";
      case "perdido": return "badge badge-error whitespace-nowrap inline-flex items-center justify-center text-center";
      case "ex-cliente": return "badge badge-neutral whitespace-nowrap inline-flex items-center justify-center text-center";
      default: return "badge badge-outline whitespace-nowrap inline-flex items-center justify-center text-center";
    }
  };

  const getInteresseBadgeClass = (nivel?: string | null) => {
    switch (nivel?.toLowerCase()) {
      case "baixo": return "badge badge-secondary";
      case "medio":
      case "médio": return "badge badge-primary";
      case "alto": return "badge badge-success";
      case "muito alto": return "badge badge-accent";
      default: return "badge";
    }
  };

  const getPrioridadeBadgeClass = (prioridade?: string | null) => {
    switch (prioridade) {
      case "Baixa": return "badge badge-ghost";
      case "Normal": return "badge badge-info";
      case "Alta": return "badge badge-warning";
      case "Urgente": return "badge badge-error";
      default: return "badge";
    }
  };

  /* =======================================================
     CARREGAR LEADS
  ======================================================= */

  const carregar = async () => {
    setLoading(true);
    setErroLista(null);

    try {
      const res = await api.get("/leads/");
      setLeads(res.data);
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error);

      setErroLista(
        error.response?.data?.erro ||
          error.response?.data?.detalhes ||
          "Não foi possível carregar os leads."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  /* =======================================================
     APLICAR FILTROS VINDOS DA URL
     (ex: /crm/leads?status=Novo, ?ramo=..., ?motivo_perda=...,
     ?editar=ID vindo do botão "Editar" do Dashboard)
  ======================================================= */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const statusUrl = params.get("status");
    const etapaUrl = params.get("etapa");
    const responsavelUrl = params.get("responsavel");
    const ramoUrl = params.get("ramo");
    const motivoPerdaUrl = params.get("motivo_perda");
    const editarUrl = params.get("editar");

    if (statusUrl) setFiltroStatus(statusUrl);
    if (etapaUrl) setFiltroEtapa(etapaUrl);
    if (responsavelUrl) setFiltroResponsavel(responsavelUrl);
    if (ramoUrl) setFiltroRamo(ramoUrl);
    if (motivoPerdaUrl) setFiltroMotivoPerda(motivoPerdaUrl);

    if (editarUrl) {
      const idNumerico = Number(editarUrl);
      if (!Number.isNaN(idNumerico)) {
        setLeadIdParaAbrir(idNumerico);
      }
    }
  }, []);

  /* =======================================================
     ABRIR MODAL DE EDIÇÃO AUTOMATICAMENTE (vindo do Dashboard)
     Espera a lista carregar para achar o lead pelo id.
  ======================================================= */

  useEffect(() => {
    if (leadIdParaAbrir === null || leads.length === 0) return;

    const lead = leads.find((l) => l.id === leadIdParaAbrir);

    if (lead) {
      iniciarEdicao(lead);
      setLeadIdParaAbrir(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadIdParaAbrir, leads]);

  /* =======================================================
     RESETAR FORMULÁRIO
  ======================================================= */

  const resetarFormulario = () => {
    setNovo({
      ...estadoInicial,
      presenca_digital: [],
      objetivo_site: [],
    });

    setErroCriacao(null);
  };

  /* =======================================================
     ALTERAR CHECKBOXES
  ======================================================= */

  const alternarArrayNovo = (
    campo: "presenca_digital" | "objetivo_site",
    valor: string
  ) => {
    const atual = novo[campo] ?? [];

    if (valor === "Nenhuma" && campo === "presenca_digital") {
      setNovo({
        ...novo,
        [campo]: atual.includes(valor) ? [] : ["Nenhuma"],
      });
      return;
    }

    const semNenhuma =
      campo === "presenca_digital"
        ? atual.filter((item) => item !== "Nenhuma")
        : atual;

    const atualizado = semNenhuma.includes(valor)
      ? semNenhuma.filter((item) => item !== valor)
      : [...semNenhuma, valor];

    setNovo({ ...novo, [campo]: atualizado });
  };

  const alternarArrayEdicao = (
    campo: "presenca_digital" | "objetivo_site",
    valor: string
  ) => {
    if (!editando) return;

    const atual = editando[campo] ?? [];

    if (valor === "Nenhuma" && campo === "presenca_digital") {
      setEditando({
        ...editando,
        [campo]: atual.includes(valor) ? [] : ["Nenhuma"],
      });
      return;
    }

    const semNenhuma =
      campo === "presenca_digital"
        ? atual.filter((item) => item !== "Nenhuma")
        : atual;

    const atualizado = semNenhuma.includes(valor)
      ? semNenhuma.filter((item) => item !== valor)
      : [...semNenhuma, valor];

    setEditando({ ...editando, [campo]: atualizado });
  };

  /* =======================================================
     CRIAR LEAD
  ======================================================= */

  const criar = async () => {
    setErroCriacao(null);

    if (!novo.nome_empresa?.trim()) {
      setErroCriacao("O nome da empresa é obrigatório.");
      return;
    }

    if (novo.ramo === "Outro" && !novo.ramo_personalizado?.trim()) {
      setErroCriacao("Informe o ramo personalizado.");
      return;
    }


    if (novo.status_lead === "Perdido" && !novo.motivo_perda) {
      setErroCriacao("Informe o motivo da perda.");
      return;
    }

    if (
      novo.status_lead === "Perdido" &&
      novo.motivo_perda === "Outro" &&
      !novo.motivo_perda_personalizado?.trim()
    ) {
      setErroCriacao("Informe o motivo personalizado da perda.");
      return;
    }

    setSalvando(true);

    try {
      await api.post("/leads/", novo);
      resetarFormulario();
      await carregar();
    } catch (error: any) {
      console.error("Erro ao criar lead:", error);

      const msg =
        error.response?.data?.erro ||
        error.response?.data?.detalhes ||
        "Erro ao criar lead. Verifique os dados.";

      setErroCriacao(msg);
    } finally {
      setSalvando(false);
    }
  };

  /* =======================================================
     ABRIR MODAL DE EDIÇÃO
  ======================================================= */

  const iniciarEdicao = (lead: Lead) => {
    setErroModal(null);
    setConverterEmCliente(false);

    setEditando({
      ...lead,
      nome_empresa: lead.nome_empresa ?? "",
      nome_contato: lead.nome_contato ?? "",
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      cidade: lead.cidade ?? "",
      ramo: lead.ramo ?? "",
      ramo_personalizado: lead.ramo_personalizado ?? "",
      presenca_digital: lead.presenca_digital ?? [],
      site: lead.site ?? "Não",
      abordado: lead.abordado ?? "Não",
      tipo_primeiro_contato: lead.tipo_primeiro_contato ?? "",
      origem_lead: lead.origem_lead ?? "",
      responsavel: lead.responsavel ?? "",
      status_lead: lead.status_lead ?? "Novo",
      etapa_comercial: lead.etapa_comercial ?? "Novo Lead",
      nivel_interesse: lead.nivel_interesse ?? "",
      potencial_valor: lead.potencial_valor ?? "",
      tipo_site: lead.tipo_site ?? "",
      objetivo_site: lead.objetivo_site ?? [],
      prazo_interesse: lead.prazo_interesse ?? "",
      decisor: lead.decisor ?? "",
      proxima_acao: lead.proxima_acao ?? "",
      data_proxima_acao: lead.data_proxima_acao ?? "",
      horario_proxima_acao: lead.horario_proxima_acao ?? "",
      prioridade: lead.prioridade ?? "Normal",
      data_primeiro_contato: lead.data_primeiro_contato ?? "",
      data_ultimo_contato: lead.data_ultimo_contato ?? "",
      data_conversao: lead.data_conversao ?? "",
      motivo_perda: lead.motivo_perda ?? "",
      motivo_perda_personalizado: lead.motivo_perda_personalizado ?? "",
      observacoes: lead.observacoes ?? "",
    });
  };

  /* =======================================================
     ATUALIZAR LEAD
  ======================================================= */

  const atualizar = async () => {
    if (!editando) return;

    setErroModal(null);

    if (!editando.nome_empresa?.trim()) {
      setErroModal("O nome da empresa é obrigatório.");
      return;
    }

    if (editando.ramo === "Outro" && !editando.ramo_personalizado?.trim()) {
      setErroModal("Informe o ramo personalizado.");
      return;
    }

    if (editando.status_lead === "Perdido" && !editando.motivo_perda) {
      setErroModal("Informe o motivo da perda.");
      return;
    }

    if (
      editando.status_lead === "Perdido" &&
      editando.motivo_perda === "Outro" &&
      !editando.motivo_perda_personalizado?.trim()
    ) {
      setErroModal("Informe o motivo personalizado da perda.");
      return;
    }

    if (converterEmCliente && editando.status_lead === "Perdido") {
      setErroModal(
        "Um lead perdido não pode ser convertido em cliente. Altere o status antes."
      );
      return;
    }

    setSalvando(true);

    try {
      await api.put(`/leads/${editando.id}`, {
        ...editando,
        converter_em_cliente: converterEmCliente,
      });

      setEditando(null);
      setConverterEmCliente(false);

      await carregar();
    } catch (error: any) {
      console.error("Erro ao atualizar lead:", error);

      const msg =
        error.response?.data?.erro ||
        error.response?.data?.detalhes ||
        "Erro ao atualizar lead. Verifique os dados.";

      setErroModal(msg);
    } finally {
      setSalvando(false);
    }
  };

  /* =======================================================
     DELETAR LEAD
  ======================================================= */

  const deletar = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) {
      return;
    }

    try {
      await api.delete(`/leads/${id}`);
      await carregar();
    } catch (error: any) {
      console.error("Erro ao deletar lead:", error);
      alert(error.response?.data?.erro || "Erro ao excluir lead.");
    }
  };

  /* =======================================================
     BUSCA E FILTROS
  ======================================================= */

  const responsaveis = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.responsavel).filter(Boolean) as string[])
      ).sort(),
    [leads]
  );

  const leadsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return leads.filter((lead) => {
      if (filtroStatus && lead.status_lead !== filtroStatus) return false;
      if (filtroEtapa && lead.etapa_comercial !== filtroEtapa) return false;
      if (filtroResponsavel && lead.responsavel !== filtroResponsavel) return false;
      if (filtroPrioridade && lead.prioridade !== filtroPrioridade) return false;
      if (filtroRamo && lead.ramo !== filtroRamo) return false;
      if (filtroMotivoPerda && lead.motivo_perda !== filtroMotivoPerda) return false;

      const data = (
        lead.data_proxima_acao ||
        lead.data_ultimo_contato ||
        lead.created_at ||
        ""
      ).slice(0, 10);

      if (filtroDataDe && (!data || data < filtroDataDe)) return false;
      if (filtroDataAte && (!data || data > filtroDataAte)) return false;

      if (!termo) return true;

      return [
        lead.id,
        lead.nome_empresa,
        lead.nome_contato,
        lead.telefone,
        lead.email,
        lead.cidade,
        lead.ramo,
        lead.ramo_personalizado,
        lead.responsavel,
        lead.status_lead,
        lead.etapa_comercial,
        lead.nivel_interesse,
        lead.origem_lead,
        lead.tipo_primeiro_contato,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [
    leads,
    busca,
    filtroStatus,
    filtroEtapa,
    filtroResponsavel,
    filtroDataDe,
    filtroDataAte,
    filtroPrioridade,
    filtroRamo,
    filtroMotivoPerda,
  ]);

  const temFiltro = Boolean(
    busca ||
      filtroStatus ||
      filtroEtapa ||
      filtroResponsavel ||
      filtroDataDe ||
      filtroDataAte ||
      filtroPrioridade ||
      filtroRamo ||
      filtroMotivoPerda
  );

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("");
    setFiltroEtapa("");
    setFiltroResponsavel("");
    setFiltroDataDe("");
    setFiltroDataAte("");
    setFiltroPrioridade("");
    setFiltroRamo("");
    setFiltroMotivoPerda("");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div>
      <Navbar />

      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold">Leads</h2>

            <p className="text-base-content/60 mt-1">
              Gerencie seus leads e acompanhe o processo comercial.
            </p>
          </div>

          <div className="badge badge-lg">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* =================================================
            FORMULÁRIO DE CADASTRO
        ================================================= */}

        <div className="card bg-base-200 p-5 mb-8">
          <h3 className="text-xl font-semibold mb-6">Adicionar Lead</h3>

          {erroCriacao && (
            <div className="alert alert-error mb-5">
              <span>{erroCriacao}</span>
            </div>
          )}

          <div className="divider">Dados da Empresa</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">
                <span className="label-text">
                  Empresa <span className="text-error">*</span>
                </span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite o nome da empresa"
                value={novo.nome_empresa || ""}
                onChange={(e) => setNovo({ ...novo, nome_empresa: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Nome do Contato</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Nome do responsável"
                value={novo.nome_contato || ""}
                onChange={(e) => setNovo({ ...novo, nome_contato: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Telefone</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="+55 21 99999-9999"
                value={novo.telefone || ""}
                onChange={(e) =>
                  setNovo({ ...novo, telefone: formatarTelefone(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">E-mail</span>
              </label>

              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="empresa@email.com"
                value={novo.email || ""}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Cidade</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Digite a cidade"
                value={novo.cidade || ""}
                onChange={(e) => setNovo({ ...novo, cidade: e.target.value })}
              />
            </div>

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
                    ramo_personalizado:
                      e.target.value === "Outro" ? novo.ramo_personalizado : "",
                  })
                }
              >
                <option value="">Selecione o ramo</option>

                {RAMOS_OPCOES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {novo.ramo === "Outro" && (
              <div>
                <label className="label">
                  <span className="label-text">
                    Especifique o Ramo <span className="text-error">*</span>
                  </span>
                </label>

                <input
                  className="input input-bordered w-full"
                  placeholder="Digite o ramo"
                  value={novo.ramo_personalizado || ""}
                  onChange={(e) =>
                    setNovo({ ...novo, ramo_personalizado: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="divider mt-8">Presença Digital</div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESENCA_DIGITAL_OPCOES.map((opcao) => (
              <label
                key={opcao}
                className="label cursor-pointer justify-start gap-2 border border-base-300 rounded-lg px-3"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={novo.presenca_digital?.includes(opcao) ?? false}
                  onChange={() => alternarArrayNovo("presenca_digital", opcao)}
                />

                <span className="label-text">{opcao}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">
                <span className="label-text">Situação do Site</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.site || "Não"}
                onChange={(e) => setNovo({ ...novo, site: e.target.value })}
              >
                {TEM_SITE_OPCOES.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Abordado?</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.abordado || "Não"}
                onChange={(e) => setNovo({ ...novo, abordado: e.target.value })}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>

          <div className="divider mt-8">Prospecção</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Tipo do Primeiro Contato</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.tipo_primeiro_contato || ""}
                onChange={(e) =>
                  setNovo({ ...novo, tipo_primeiro_contato: e.target.value })
                }
              >
                <option value="">Selecione</option>

                {TIPOS_PRIMEIRO_CONTATO.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Origem do Lead</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.origem_lead || ""}
                onChange={(e) => setNovo({ ...novo, origem_lead: e.target.value })}
              >
                <option value="">Selecione</option>

                {ORIGENS_LEAD.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Responsável</span>
              </label>

              <input
                className="input input-bordered w-full"
                placeholder="Responsável pelo lead"
                value={novo.responsavel || ""}
                onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Data do Primeiro Contato</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_primeiro_contato || ""}
                onChange={(e) =>
                  setNovo({ ...novo, data_primeiro_contato: e.target.value })
                }
              />
            </div>
          </div>

          <div className="divider mt-8">Funil Comercial</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    motivo_perda:
                      e.target.value === "Perdido" ? novo.motivo_perda : "",
                    motivo_perda_personalizado:
                      e.target.value === "Perdido"
                        ? novo.motivo_perda_personalizado
                        : "",
                  })
                }
              >
                {STATUS_LEAD.map((opcao) => (
                  <option
                    key={opcao}
                    value={opcao}
                    disabled={STATUS_AUTOMATICOS.includes(opcao)}
                  >
                    {opcao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Etapa Comercial</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.etapa_comercial || "Novo Lead"}
                onChange={(e) =>
                  setNovo({ ...novo, etapa_comercial: e.target.value })
                }
              >
                {ETAPAS_COMERCIAIS.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Nível de Interesse</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.nivel_interesse || ""}
                onChange={(e) =>
                  setNovo({ ...novo, nivel_interesse: e.target.value })
                }
              >
                <option value="">Selecione</option>

                {NIVEIS_INTERESSE.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Potencial de Valor</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.potencial_valor || ""}
                onChange={(e) =>
                  setNovo({ ...novo, potencial_valor: e.target.value })
                }
              >
                <option value="">Selecione</option>

                {POTENCIAIS_VALORES.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Prioridade</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.prioridade || "Normal"}
                onChange={(e) => setNovo({ ...novo, prioridade: e.target.value })}
              >
                {PRIORIDADES.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Decisor</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.decisor || ""}
                onChange={(e) => setNovo({ ...novo, decisor: e.target.value })}
              >
                <option value="">Selecione</option>

                {DECISORES.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divider mt-8">Projeto / Necessidade</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Tipo de Site / Projeto</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.tipo_site || ""}
                onChange={(e) => setNovo({ ...novo, tipo_site: e.target.value })}
              >
                <option value="">Selecione</option>

                {TIPOS_SITE.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Prazo de Interesse</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.prazo_interesse || ""}
                onChange={(e) =>
                  setNovo({ ...novo, prazo_interesse: e.target.value })
                }
              >
                <option value="">Selecione</option>

                {PRAZOS_INTERESSE.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">
              <span className="label-text">Objetivos do Site / Projeto</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {OBJETIVOS_SITE.map((opcao) => (
                <label
                  key={opcao}
                  className="label cursor-pointer justify-start gap-2 border border-base-300 rounded-lg px-3"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={novo.objetivo_site?.includes(opcao) ?? false}
                    onChange={() => alternarArrayNovo("objetivo_site", opcao)}
                  />

                  <span className="label-text">{opcao}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="divider mt-8">Próxima Ação</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Próxima Ação</span>
              </label>

              <select
                className="select select-bordered w-full"
                value={novo.proxima_acao || ""}
                onChange={(e) => setNovo({ ...novo, proxima_acao: e.target.value })}
              >
                <option value="">Selecione</option>

                {PROXIMAS_ACOES.map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Data da Próxima Ação</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_proxima_acao || ""}
                onChange={(e) =>
                  setNovo({ ...novo, data_proxima_acao: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Horário</span>
              </label>

              <input
                type="time"
                className="input input-bordered w-full"
                value={novo.horario_proxima_acao || ""}
                onChange={(e) =>
                  setNovo({ ...novo, horario_proxima_acao: e.target.value })
                }
              />
            </div>
          </div>

          <div className="divider mt-8">Histórico</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Data Primeiro Contato</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_primeiro_contato || ""}
                onChange={(e) =>
                  setNovo({ ...novo, data_primeiro_contato: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Data Último Contato</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_ultimo_contato || ""}
                onChange={(e) =>
                  setNovo({ ...novo, data_ultimo_contato: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Data de Conversão</span>
              </label>

              <input
                type="date"
                className="input input-bordered w-full"
                value={novo.data_conversao || ""}
                onChange={(e) =>
                  setNovo({ ...novo, data_conversao: e.target.value })
                }
              />
            </div>
          </div>

          {novo.status_lead === "Perdido" && (
            <>
              <div className="divider mt-8">Perda do Lead</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        motivo_perda_personalizado:
                          e.target.value === "Outro"
                            ? novo.motivo_perda_personalizado
                            : "",
                      })
                    }
                  >
                    <option value="">Selecione o motivo</option>

                    {MOTIVOS_PERDA_OPCOES.map((motivo) => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>

                {novo.motivo_perda === "Outro" && (
                  <div>
                    <label className="label">
                      <span className="label-text">
                        Especifique o Motivo <span className="text-error">*</span>
                      </span>
                    </label>

                    <input
                      className="input input-bordered w-full"
                      placeholder="Digite o motivo"
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
              </div>
            </>
          )}

          <div className="divider mt-8">Observações</div>

          <textarea
            className="textarea textarea-bordered w-full min-h-32"
            placeholder="Digite informações adicionais sobre o lead..."
            value={novo.observacoes || ""}
            onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })}
          />

          <button
            className="btn btn-primary mt-6"
            onClick={criar}
            disabled={salvando}
          >
            {salvando ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Salvando...
              </>
            ) : (
              "Salvar Lead"
            )}
          </button>
        </div>

        {/* =================================================
            LISTAGEM + FILTROS
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-2">
          <input
            className="input input-bordered xl:col-span-2"
            placeholder="Pesquisar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="select select-bordered"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {STATUS_LEAD.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
          >
            <option value="">Todas as etapas</option>
            {ETAPAS_COMERCIAIS.map((etapa) => (
              <option key={etapa} value={etapa}>{etapa}</option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
          >
            <option value="">Todas as prioridades</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <select
            className="select select-bordered"
            value={filtroRamo}
            onChange={(e) => setFiltroRamo(e.target.value)}
          >
            <option value="">Todos os ramos</option>
            {RAMOS_OPCOES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroMotivoPerda}
            onChange={(e) => setFiltroMotivoPerda(e.target.value)}
          >
            <option value="">Todos os motivos de perda</option>
            {MOTIVOS_PERDA_OPCOES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="date"
            className="input input-bordered"
            value={filtroDataDe}
            onChange={(e) => setFiltroDataDe(e.target.value)}
            title="Data inicial"
          />

          <input
            type="date"
            className="input input-bordered"
            value={filtroDataAte}
            onChange={(e) => setFiltroDataAte(e.target.value)}
            title="Data final"
          />

          <button
            className="btn btn-outline"
            onClick={limparFiltros}
            disabled={!temFiltro}
          >
            Limpar filtros
          </button>

          <button
            className="btn btn-outline"
            onClick={carregar}
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

            <button className="btn btn-sm" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body items-center text-center py-16">
              <h3 className="text-xl font-semibold">
                {temFiltro ? "Nenhum lead encontrado" : "Nenhum lead cadastrado"}
              </h3>

              <p className="text-base-content/60">
                {temFiltro
                  ? "Tente alterar os filtros aplicados."
                  : "Cadastre o primeiro lead usando o formulário acima."}
              </p>
            </div>
          </div>
        ) : (
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
                  <th>Etapa</th>
                  <th>Status</th>
                  <th>Interesse</th>
                  <th>Prioridade</th>
                  <th>Responsável</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {leadsFiltrados.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.id}</td>

                    <td>
                      <div className="font-semibold">
                        {lead.nome_empresa || "-"}
                      </div>

                      {lead.email && (
                        <div className="text-xs text-base-content/60">
                          {lead.email}
                        </div>
                      )}
                    </td>

                    <td>{lead.nome_contato || "-"}</td>

                    <td>
                      {lead.telefone ? formatarTelefone(lead.telefone) : "-"}
                    </td>

                    <td>{lead.cidade || "-"}</td>

                    <td>
                      {lead.ramo === "Outro"
                        ? lead.ramo_personalizado || "Outro"
                        : lead.ramo || "-"}
                    </td>

                    <td className="whitespace-nowrap">
                      <span className={getEtapaBadgeClass(lead.etapa_comercial)}>
                        {lead.etapa_comercial || "-"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      <span className={getStatusBadgeClass(lead.status_lead)}>
                        {lead.status_lead || "-"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      {lead.nivel_interesse ? (
                        <span className={getInteresseBadgeClass(lead.nivel_interesse)}>
                          {lead.nivel_interesse}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="whitespace-nowrap">
                      <span className={getPrioridadeBadgeClass(lead.prioridade)}>
                        {lead.prioridade || "-"}
                      </span>
                    </td>

                    <td>{lead.responsavel || "-"}</td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => iniciarEdicao(lead)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          disabled={!!lead.cliente_id}
                          title={
                            lead.cliente_id
                              ? "Lead vinculado a um cliente. Exclua o cliente primeiro."
                              : undefined
                          }
                          onClick={() => deletar(lead.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =================================================
            MODAL DE EDIÇÃO
        ================================================= */}

        {editando && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl">
                Editar Lead #{editando.id}
              </h3>

              <p className="text-sm text-base-content/60 mt-1">
                Atualize todas as informações comerciais do lead.
              </p>

              {erroModal && (
                <div className="alert alert-error my-4">
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="divider">Dados da Empresa</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">
                    <span className="label-text">
                      Empresa <span className="text-error">*</span>
                    </span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    value={editando.nome_empresa ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, nome_empresa: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Nome do Contato</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    value={editando.nome_contato ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, nome_contato: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Telefone</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    value={editando.telefone ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        telefone: formatarTelefone(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">E-mail</span>
                  </label>

                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={editando.email ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Cidade</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    value={editando.cidade ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, cidade: e.target.value })
                    }
                  />
                </div>

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
                        ramo_personalizado:
                          e.target.value === "Outro"
                            ? editando.ramo_personalizado
                            : "",
                      })
                    }
                  >
                    <option value="">Selecione o ramo</option>

                    {RAMOS_OPCOES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {editando.ramo === "Outro" && (
                  <div>
                    <label className="label">
                      <span className="label-text">
                        Especifique o Ramo <span className="text-error">*</span>
                      </span>
                    </label>

                    <input
                      className="input input-bordered w-full"
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
              </div>

              <div className="divider mt-8">Presença Digital</div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {PRESENCA_DIGITAL_OPCOES.map((opcao) => (
                  <label
                    key={opcao}
                    className="label cursor-pointer justify-start gap-2 border border-base-300 rounded-lg px-3"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={editando.presenca_digital?.includes(opcao) ?? false}
                      onChange={() => alternarArrayEdicao("presenca_digital", opcao)}
                    />

                    <span className="label-text">{opcao}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">
                    <span className="label-text">Situação do Site</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.site ?? "Não"}
                    onChange={(e) =>
                      setEditando({ ...editando, site: e.target.value })
                    }
                  >
                    {TEM_SITE_OPCOES.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Abordado?</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.abordado ?? "Não"}
                    onChange={(e) =>
                      setEditando({ ...editando, abordado: e.target.value })
                    }
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
              </div>

              <div className="divider mt-8">Prospecção</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Tipo do Primeiro Contato</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.tipo_primeiro_contato ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        tipo_primeiro_contato: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>

                    {TIPOS_PRIMEIRO_CONTATO.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Origem do Lead</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.origem_lead ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, origem_lead: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>

                    {ORIGENS_LEAD.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Responsável</span>
                  </label>

                  <input
                    className="input input-bordered w-full"
                    value={editando.responsavel ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, responsavel: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Data Primeiro Contato</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_primeiro_contato ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_primeiro_contato: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="divider mt-8">Funil Comercial</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    disabled={!!editando.cliente_id}
                    value={editando.status_lead ?? "Novo"}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        status_lead: e.target.value,
                        motivo_perda:
                          e.target.value === "Perdido"
                            ? editando.motivo_perda
                            : "",
                        motivo_perda_personalizado:
                          e.target.value === "Perdido"
                            ? editando.motivo_perda_personalizado
                            : "",
                      })
                    }
                  >
                    {STATUS_LEAD.map((opcao) => (
                      <option
                        key={opcao}
                        value={opcao}
                        disabled={
                          STATUS_AUTOMATICOS.includes(opcao) &&
                          opcao !== editando.status_lead
                        }
                      >
                        {opcao}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Etapa Comercial</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    disabled={!!editando.cliente_id}
                    value={editando.etapa_comercial ?? "Novo Lead"}
                    onChange={(e) =>
                      setEditando({ ...editando, etapa_comercial: e.target.value })
                    }
                  >
                    {ETAPAS_COMERCIAIS.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Nível de Interesse</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.nivel_interesse ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nivel_interesse: e.target.value,
                      })
                    }
                  >
                    <option value="">Sem interesse definido</option>

                    {NIVEIS_INTERESSE.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Potencial de Valor</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.potencial_valor ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        potencial_valor: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>

                    {POTENCIAIS_VALORES.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Prioridade</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.prioridade ?? "Normal"}
                    onChange={(e) =>
                      setEditando({ ...editando, prioridade: e.target.value })
                    }
                  >
                    {PRIORIDADES.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Decisor</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.decisor ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, decisor: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>

                    {DECISORES.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label
                  className={`label justify-start gap-3 border border-base-300 rounded-lg px-3 ${
                    editando.cliente_id ? "opacity-70" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-success"
                    checked={!!editando.cliente_id || converterEmCliente}
                    disabled={!!editando.cliente_id}
                    onChange={(e) => setConverterEmCliente(e.target.checked)}
                  />

                  <span className="label-text font-medium">
                    {editando.cliente_id
                      ? `Convertido em cliente (#${editando.cliente_id})`
                      : "Converter em cliente"}
                  </span>
                </label>

                <p className="text-xs text-base-content/60 mt-1">
                  {editando.cliente_id
                    ? "Para desfazer, exclua o cliente. O lead ficará como Ex-Cliente."
                    : "Ao salvar, o cliente será criado e o lead ficará como Convertido, etapa Fechado."}
                </p>
              </div>

              <div className="divider mt-8">Projeto / Necessidade</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Tipo de Site / Projeto</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.tipo_site ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, tipo_site: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>

                    {TIPOS_SITE.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Prazo de Interesse</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.prazo_interesse ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        prazo_interesse: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>

                    {PRAZOS_INTERESSE.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="label">
                  <span className="label-text">Objetivos</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {OBJETIVOS_SITE.map((opcao) => (
                    <label
                      key={opcao}
                      className="label cursor-pointer justify-start gap-2 border border-base-300 rounded-lg px-3"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={editando.objetivo_site?.includes(opcao) ?? false}
                        onChange={() => alternarArrayEdicao("objetivo_site", opcao)}
                      />

                      <span className="label-text">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="divider mt-8">Próxima Ação</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Próxima Ação</span>
                  </label>

                  <select
                    className="select select-bordered w-full"
                    value={editando.proxima_acao ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, proxima_acao: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>

                    {PROXIMAS_ACOES.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Data</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_proxima_acao ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_proxima_acao: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Horário</span>
                  </label>

                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={editando.horario_proxima_acao ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        horario_proxima_acao: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="divider mt-8">Histórico</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Primeiro Contato</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_primeiro_contato ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_primeiro_contato: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Último Contato</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_ultimo_contato ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_ultimo_contato: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Data de Conversão</span>
                  </label>

                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editando.data_conversao ?? ""}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        data_conversao: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {editando.status_lead === "Perdido" && (
                <>
                  <div className="divider mt-8">Perda do Lead</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            motivo_perda_personalizado:
                              e.target.value === "Outro"
                                ? editando.motivo_perda_personalizado
                                : "",
                          })
                        }
                      >
                        <option value="">Selecione</option>

                        {MOTIVOS_PERDA_OPCOES.map((motivo) => (
                          <option key={motivo} value={motivo}>{motivo}</option>
                        ))}
                      </select>
                    </div>

                    {editando.motivo_perda === "Outro" && (
                      <div>
                        <label className="label">
                          <span className="label-text">
                            Especifique o Motivo{" "}
                            <span className="text-error">*</span>
                          </span>
                        </label>

                        <input
                          className="input input-bordered w-full"
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
                </>
              )}

              <div className="divider mt-8">Observações</div>

              <textarea
                className="textarea textarea-bordered w-full min-h-32"
                placeholder="Observações sobre o lead..."
                value={editando.observacoes ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, observacoes: e.target.value })
                }
              />

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
                    "Salvar Alterações"
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