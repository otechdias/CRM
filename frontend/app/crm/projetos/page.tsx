// FRONTEND/PROJETOS
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";

/* =========================================================
   TIPOS
========================================================= */

interface Cliente {
  id: number;
  nome_empresa: string;
  status_cliente?: string | null;
}

interface Projeto {
  id: number;
  cliente_id: number;
  cliente_nome?: string | null;

  nome_projeto: string;
  tipo_projeto?: string | null;
  plano?: string | null;
  status_projeto?: string | null;

  responsavel?: string | null;
  prioridade?: string | null;

  data_inicio?: string | null;
  data_previsao?: string | null;
  data_entrega?: string | null;

  valor_projeto?: number | null;

  link_projeto?: string | null;
  repositorio?: string | null;
  dominio?: string | null;

  observacoes?: string | null;
  created_at?: string | null;
}

// Todos os campos como texto: facilita os inputs.
// A conversão para número/null é feita em montarPayload().
interface ProjetoForm {
  cliente_id: string;
  nome_projeto: string;
  tipo_projeto: string;
  plano: string;
  status_projeto: string;
  responsavel: string;
  prioridade: string;
  data_inicio: string;
  data_previsao: string;
  data_entrega: string;
  valor_projeto: string;
  link_projeto: string;
  repositorio: string;
  dominio: string;
  observacoes: string;
}

/* =========================================================
   OPÇÕES (iguais às do backend)
========================================================= */

const STATUS_PROJETO = [
  "Briefing",
  "Em andamento",
  "Em revisão",
  "Aguardando cliente",
  "Pausado",
  "Entregue",
  "Cancelado",
];

const PRIORIDADES = ["Baixa", "Normal", "Alta", "Urgente"];

const TIPOS_PROJETO = [
  "Landing Page",
  "Site Institucional",
  "Site Profissional",
  "E-commerce",
  "Catálogo Online",
  "Portal",
  "Blog",
  "Sistema Web",
  "Área do Cliente",
  "Página de Captura",
  "Página de Vendas",
  "Redesign de Site",
  "Otimização de Site Existente",
  "Manutenção",
  "Outro",
];

const PLANOS = ["Plano Essencial", "Plano Pro", "Plano Pro Max"];

const FORM_VAZIO: ProjetoForm = {
  cliente_id: "",
  nome_projeto: "",
  tipo_projeto: "",
  plano: "",
  status_projeto: "Briefing",
  responsavel: "",
  prioridade: "Normal",
  data_inicio: "",
  data_previsao: "",
  data_entrega: "",
  valor_projeto: "",
  link_projeto: "",
  repositorio: "",
  dominio: "",
  observacoes: "",
};

const URL_REGEX = /^https?:\/\/\S+$/i;
const DOMINIO_REGEX = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

// Devolve a opção no formato padrão (ex.: "em andamento" -> "Em andamento")
const canonica = (
  valor: string | null | undefined,
  opcoes: string[],
  padrao: string
) => {
  if (!valor) return padrao;

  return (
    opcoes.find(
      (opcao) => opcao.toLowerCase() === valor.trim().toLowerCase()
    ) ?? padrao
  );
};

const formatarData = (valor?: string | null) => {
  if (!valor) return "-";

  const [ano, mes, dia] = valor.split("-");

  if (!ano || !mes || !dia) return valor;

  return `${dia}/${mes}/${ano}`;
};

const formatarMoeda = (valor?: number | null) => {
  if (valor === null || valor === undefined) return "-";

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const getStatusBadgeClass = (status?: string | null) => {
  switch (canonica(status, STATUS_PROJETO, "")) {
    case "Briefing":
      return "badge badge-info";

    case "Em andamento":
      return "badge badge-warning";

    case "Em revisão":
      return "badge badge-secondary";

    case "Aguardando cliente":
      return "badge badge-accent";

    case "Pausado":
      return "badge badge-ghost";

    case "Entregue":
      return "badge badge-success";

    case "Cancelado":
      return "badge badge-error";

    default:
      return "badge";
  }
};

const getPrioridadeBadgeClass = (prioridade?: string | null) => {
  switch (prioridade) {
    case "Baixa":
      return "badge badge-ghost";

    case "Normal":
      return "badge badge-info";

    case "Alta":
      return "badge badge-warning";

    case "Urgente":
      return "badge badge-error";

    default:
      return "badge";
  }
};

const extrairErro = (error: unknown, padrao: string) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.erro ||
      error.response?.data?.detalhes ||
      padrao
    );
  }

  return padrao;
};

// Retorna a mensagem de erro ou null se estiver tudo certo
const validarProjeto = (f: ProjetoForm): string | null => {
  if (!f.cliente_id) {
    return "Selecione o cliente.";
  }

  if (!f.nome_projeto.trim()) {
    return "Informe o nome do projeto.";
  }

  if (f.valor_projeto !== "") {
    const valor = Number(f.valor_projeto);

    if (Number.isNaN(valor)) {
      return "Informe um valor válido.";
    }

    if (valor < 0) {
      return "O valor do projeto não pode ser negativo.";
    }
  }

  if (
    f.data_inicio &&
    f.data_previsao &&
    f.data_previsao < f.data_inicio
  ) {
    return "A data de previsão não pode ser anterior à data de início.";
  }

  if (
    f.data_inicio &&
    f.data_entrega &&
    f.data_entrega < f.data_inicio
  ) {
    return "A data de entrega não pode ser anterior à data de início.";
  }

  if (f.link_projeto.trim() && !URL_REGEX.test(f.link_projeto.trim())) {
    return "O link do projeto deve começar com http:// ou https://.";
  }

  if (f.repositorio.trim() && !URL_REGEX.test(f.repositorio.trim())) {
    return "O link do repositório deve começar com http:// ou https://.";
  }

  if (f.dominio.trim() && !DOMINIO_REGEX.test(f.dominio.trim())) {
    return "Informe apenas o domínio, por exemplo: empresa.com.br.";
  }

  return null;
};

const montarPayload = (f: ProjetoForm) => ({
  cliente_id: f.cliente_id ? Number(f.cliente_id) : null,
  nome_projeto: f.nome_projeto.trim(),
  tipo_projeto: f.tipo_projeto || null,
  plano: f.plano || null,
  status_projeto: f.status_projeto,
  responsavel: f.responsavel.trim() || null,
  prioridade: f.prioridade,
  data_inicio: f.data_inicio || null,
  data_previsao: f.data_previsao || null,
  data_entrega: f.data_entrega || null,
  valor_projeto: f.valor_projeto === "" ? null : Number(f.valor_projeto),
  link_projeto: f.link_projeto.trim() || null,
  repositorio: f.repositorio.trim() || null,
  dominio: f.dominio.trim() || null,
  observacoes: f.observacoes.trim() || null,
});

/* =========================================================
   CAMPOS DO FORMULÁRIO (usados na criação e na edição)
========================================================= */

interface CamposProjetoProps {
  dados: ProjetoForm;
  clientes: Cliente[];
  onChange: (campo: keyof ProjetoForm, valor: string) => void;
}

function CamposProjeto({ dados, clientes, onChange }: CamposProjetoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cliente */}
      <div>
        <label className="label">
          <span className="label-text">
            Cliente <span className="text-error">*</span>
          </span>
        </label>

        <select
          className="select select-bordered w-full"
          value={dados.cliente_id}
          onChange={(e) => onChange("cliente_id", e.target.value)}
        >
          <option value="">Selecione o cliente</option>

          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome_empresa}
            </option>
          ))}
        </select>
      </div>

      {/* Nome */}
      <div>
        <label className="label">
          <span className="label-text">
            Nome do Projeto <span className="text-error">*</span>
          </span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="Digite o nome do projeto"
          value={dados.nome_projeto}
          onChange={(e) => onChange("nome_projeto", e.target.value)}
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="label">
          <span className="label-text">Tipo de Projeto</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={dados.tipo_projeto}
          onChange={(e) => onChange("tipo_projeto", e.target.value)}
        >
          <option value="">Selecione o tipo</option>

          {TIPOS_PROJETO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>

      {/* Plano */}
      <div>
        <label className="label">
          <span className="label-text">Plano</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={dados.plano}
          onChange={(e) => onChange("plano", e.target.value)}
        >
          <option value="">Selecione o plano</option>

          {PLANOS.map((plano) => (
            <option key={plano} value={plano}>
              {plano}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="label">
          <span className="label-text">Status do Projeto</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={dados.status_projeto}
          onChange={(e) => onChange("status_projeto", e.target.value)}
        >
          {STATUS_PROJETO.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Prioridade */}
      <div>
        <label className="label">
          <span className="label-text">Prioridade</span>
        </label>

        <select
          className="select select-bordered w-full"
          value={dados.prioridade}
          onChange={(e) => onChange("prioridade", e.target.value)}
        >
          {PRIORIDADES.map((prioridade) => (
            <option key={prioridade} value={prioridade}>
              {prioridade}
            </option>
          ))}
        </select>
      </div>

      {/* Responsável */}
      <div>
        <label className="label">
          <span className="label-text">Responsável</span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="Responsável pelo projeto"
          value={dados.responsavel}
          onChange={(e) => onChange("responsavel", e.target.value)}
        />
      </div>

      {/* Valor */}
      <div>
        <label className="label">
          <span className="label-text">Valor do Projeto</span>
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          className="input input-bordered w-full"
          placeholder="0,00"
          value={dados.valor_projeto}
          onChange={(e) => onChange("valor_projeto", e.target.value)}
        />
      </div>

      {/* Data de Início */}
      <div>
        <label className="label">
          <span className="label-text">Data de Início</span>
        </label>

        <input
          type="date"
          className="input input-bordered w-full"
          value={dados.data_inicio}
          onChange={(e) => onChange("data_inicio", e.target.value)}
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
          value={dados.data_previsao}
          onChange={(e) => onChange("data_previsao", e.target.value)}
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
          value={dados.data_entrega}
          onChange={(e) => onChange("data_entrega", e.target.value)}
        />

        <p className="text-xs text-base-content/60 mt-1">
          Se o status for Entregue e este campo ficar vazio, será
          preenchido com a data de hoje.
        </p>
      </div>

      {/* Domínio */}
      <div>
        <label className="label">
          <span className="label-text">Domínio</span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="empresa.com.br"
          value={dados.dominio}
          onChange={(e) => onChange("dominio", e.target.value)}
        />
      </div>

      {/* Link do projeto */}
      <div>
        <label className="label">
          <span className="label-text">Link do Projeto</span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="https://..."
          value={dados.link_projeto}
          onChange={(e) => onChange("link_projeto", e.target.value)}
        />
      </div>

      {/* Repositório */}
      <div>
        <label className="label">
          <span className="label-text">Repositório</span>
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="https://github.com/..."
          value={dados.repositorio}
          onChange={(e) => onChange("repositorio", e.target.value)}
        />
      </div>

      {/* Observações */}
      <div className="md:col-span-2">
        <label className="label">
          <span className="label-text">Observações</span>
        </label>

        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Observações sobre o projeto..."
          value={dados.observacoes}
          onChange={(e) => onChange("observacoes", e.target.value)}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [novo, setNovo] = useState<ProjetoForm>(FORM_VAZIO);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicao, setFormEdicao] = useState<ProjetoForm>(FORM_VAZIO);

  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  /* -------------------------------------------------------
     CARREGAR
  ------------------------------------------------------- */

  const carregar = async () => {
    setCarregando(true);
    setErroLista(null);

    try {
      const [resProjetos, resClientes] = await Promise.all([
        api.get("/projetos/"),
        api.get("/clientes/"),
      ]);

      setProjetos(resProjetos.data);
      setClientes(resClientes.data);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);

      setErroLista(
        extrairErro(error, "Não foi possível carregar os projetos.")
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  /* -------------------------------------------------------
     APLICAR FILTROS VINDOS DA URL (ex: links do Dashboard,
     como /crm/projetos?status=Em%20andamento)
  ------------------------------------------------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusUrl = params.get("status");

    if (statusUrl) setFiltroStatus(statusUrl);
  }, []);

  /* -------------------------------------------------------
     FORMULÁRIOS
  ------------------------------------------------------- */

  const alterarNovo = (campo: keyof ProjetoForm, valor: string) => {
    setNovo((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const alterarEdicao = (campo: keyof ProjetoForm, valor: string) => {
    setFormEdicao((anterior) => ({ ...anterior, [campo]: valor }));
  };

  /* -------------------------------------------------------
     CRIAR
  ------------------------------------------------------- */

  const criar = async () => {
    setErroCriacao(null);

    const erro = validarProjeto(novo);

    if (erro) {
      setErroCriacao(erro);
      return;
    }

    setSalvando(true);

    try {
      await api.post("/projetos/", montarPayload(novo));

      setNovo({ ...FORM_VAZIO });

      await carregar();
    } catch (error) {
      console.error("Erro ao criar projeto:", error);

      setErroCriacao(
        extrairErro(error, "Erro ao criar projeto. Verifique os dados.")
      );
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     EDITAR
  ------------------------------------------------------- */

  const abrirEdicao = (projeto: Projeto) => {
    setErroModal(null);

    setFormEdicao({
      cliente_id: String(projeto.cliente_id),
      nome_projeto: projeto.nome_projeto || "",
      tipo_projeto: canonica(projeto.tipo_projeto, TIPOS_PROJETO, ""),
      plano: canonica(projeto.plano, PLANOS, ""),
      status_projeto: canonica(
        projeto.status_projeto,
        STATUS_PROJETO,
        "Briefing"
      ),
      responsavel: projeto.responsavel || "",
      prioridade: canonica(projeto.prioridade, PRIORIDADES, "Normal"),
      data_inicio: projeto.data_inicio || "",
      data_previsao: projeto.data_previsao || "",
      data_entrega: projeto.data_entrega || "",
      valor_projeto:
        projeto.valor_projeto !== null &&
        projeto.valor_projeto !== undefined
          ? String(projeto.valor_projeto)
          : "",
      link_projeto: projeto.link_projeto || "",
      repositorio: projeto.repositorio || "",
      dominio: projeto.dominio || "",
      observacoes: projeto.observacoes || "",
    });

    setEditandoId(projeto.id);
  };

  const fecharEdicao = () => {
    setEditandoId(null);
    setErroModal(null);
  };

  const atualizar = async () => {
    if (editandoId === null) return;

    setErroModal(null);

    const erro = validarProjeto(formEdicao);

    if (erro) {
      setErroModal(erro);
      return;
    }

    setSalvando(true);

    try {
      await api.put(
        `/projetos/${editandoId}`,
        montarPayload(formEdicao)
      );

      setEditandoId(null);

      await carregar();
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);

      setErroModal(
        extrairErro(
          error,
          "Erro ao atualizar projeto. Verifique os dados."
        )
      );
    } finally {
      setSalvando(false);
    }
  };

  /* -------------------------------------------------------
     EXCLUIR
  ------------------------------------------------------- */

  const deletar = async (projeto: Projeto) => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir o projeto "${projeto.nome_projeto}"?\n\nPagamentos vinculados a ele continuarão existindo, mas ficarão sem projeto.\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    try {
      setExcluindoId(projeto.id);

      await api.delete(`/projetos/${projeto.id}`);

      await carregar();
    } catch (error) {
      console.error("Erro ao deletar projeto:", error);

      alert(extrairErro(error, "Não foi possível excluir o projeto."));
    } finally {
      setExcluindoId(null);
    }
  };

  /* -------------------------------------------------------
     FILTROS
  ------------------------------------------------------- */

  const temFiltro = !!(
    busca.trim() ||
    filtroStatus ||
    filtroPrioridade ||
    filtroCliente
  );

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("");
    setFiltroPrioridade("");
    setFiltroCliente("");
    setFiltroDataDe("");
    setFiltroDataAte("");
  };

  const projetosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return projetos.filter((projeto) => {
      if (
        filtroStatus &&
        canonica(projeto.status_projeto, STATUS_PROJETO, "") !==
          filtroStatus
      ) {
        return false;
      }

      if (filtroPrioridade && projeto.prioridade !== filtroPrioridade) {
        return false;
      }

      if (filtroCliente && String(projeto.cliente_id) !== filtroCliente) return false;
      const data = (projeto.data_previsao || projeto.data_inicio || projeto.data_entrega || projeto.created_at || "").slice(0, 10);
      if (filtroDataDe && (!data || data < filtroDataDe)) return false;
      if (filtroDataAte && (!data || data > filtroDataAte)) return false;
      if (!termo) return true;

      const texto = [
        projeto.id,
        projeto.nome_projeto,
        projeto.cliente_nome,
        projeto.tipo_projeto,
        projeto.plano,
        projeto.responsavel,
        projeto.dominio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [projetos, busca, filtroStatus, filtroPrioridade, filtroCliente, filtroDataDe, filtroDataAte]);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div>
      <Navbar />

      <div className="p-6">
        {/* CABEÇALHO */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold">Projetos</h2>

            <p className="text-base-content/60 mt-1">
              Controle status, prazos e valores dos projetos dos seus
              clientes.
            </p>
          </div>

          <div className="badge badge-lg">
            {projetos.length} projeto{projetos.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}

        <div className="card bg-base-200 p-5 mb-8">
          <h3 className="text-xl font-semibold mb-4">
            Adicionar Projeto
          </h3>

          {erroCriacao && (
            <div className="alert alert-error mb-4">
              <span>{erroCriacao}</span>
            </div>
          )}

          <CamposProjeto
            dados={novo}
            clientes={clientes}
            onChange={alterarNovo}
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
              "Salvar Projeto"
            )}
          </button>
        </div>

        {/* FILTROS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <input
            className="input input-bordered lg:col-span-2"
            placeholder="Buscar por projeto, cliente, tipo, responsável, domínio..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="select select-bordered"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>

            {STATUS_PROJETO.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
          >
            <option value="">Todas as prioridades</option>

            {PRIORIDADES.map((prioridade) => (
              <option key={prioridade} value={prioridade}>
                {prioridade}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos os clientes</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome_empresa}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input type="date" className="input input-bordered input-sm" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} title="Data inicial" />
          <input type="date" className="input input-bordered input-sm" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} title="Data final" />

          <button
            className="btn btn-outline btn-sm"
            onClick={limparFiltros}
            disabled={!temFiltro}
          >
            Limpar filtros
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={carregar}
            disabled={carregando}
          >
            {carregando ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Atualizar"
            )}
          </button>

          {temFiltro && (
            <span className="text-sm text-base-content/60">
              {projetosFiltrados.length} de {projetos.length} projeto
              {projetos.length !== 1 ? "s" : ""}
            </span>
          )}
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

        {carregando ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : projetosFiltrados.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body items-center text-center py-16">
              <h3 className="text-xl font-semibold">
                {temFiltro
                  ? "Nenhum projeto encontrado"
                  : "Nenhum projeto cadastrado"}
              </h3>

              <p className="text-base-content/60">
                {temFiltro
                  ? "Tente alterar ou limpar os filtros."
                  : "Cadastre o primeiro projeto usando o formulário acima."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Projeto</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Responsável</th>
                  <th>Datas</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {projetosFiltrados.map((projeto) => (
                  <tr key={projeto.id}>
                    <td>{projeto.id}</td>

                    <td>
                      {projeto.cliente_nome ||
                        clientes.find(
                          (cliente) => cliente.id === projeto.cliente_id
                        )?.nome_empresa ||
                        `ID: ${projeto.cliente_id}`}
                    </td>

                    <td>
                      <div className="font-semibold">
                        {projeto.nome_projeto}
                      </div>

                      {(projeto.tipo_projeto || projeto.plano) && (
                        <div className="text-xs text-base-content/60">
                          {[projeto.tipo_projeto, projeto.plano]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}

                      {projeto.dominio && (
                        <div className="text-xs text-base-content/60">
                          {projeto.dominio}
                        </div>
                      )}

                      {projeto.link_projeto && (
                        <a
                          href={projeto.link_projeto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-xs"
                        >
                          Abrir projeto
                        </a>
                      )}
                    </td>

                    <td>
                      <span
                        className={getStatusBadgeClass(
                          projeto.status_projeto
                        )}
                      >
                        {projeto.status_projeto || "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={getPrioridadeBadgeClass(
                          projeto.prioridade
                        )}
                      >
                        {projeto.prioridade || "-"}
                      </span>
                    </td>

                    <td>{projeto.responsavel || "-"}</td>

                    <td className="text-xs whitespace-nowrap">
                      <div>Início: {formatarData(projeto.data_inicio)}</div>
                      <div>
                        Previsão: {formatarData(projeto.data_previsao)}
                      </div>
                      <div>
                        Entrega: {formatarData(projeto.data_entrega)}
                      </div>
                    </td>

                    <td>{formatarMoeda(projeto.valor_projeto)}</td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => abrirEdicao(projeto)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => deletar(projeto)}
                          disabled={excluindoId === projeto.id}
                        >
                          {excluindoId === projeto.id
                            ? "Excluindo..."
                            : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL DE EDIÇÃO */}

        {editandoId !== null && (
          <div className="modal modal-open">
            <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-xl">
                Editar Projeto #{editandoId}
              </h3>

              <p className="text-sm text-base-content/60 mt-1">
                Atualize as informações do projeto.
              </p>

              {erroModal && (
                <div className="alert alert-error my-4">
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="mt-4">
                <CamposProjeto
                  dados={formEdicao}
                  clientes={clientes}
                  onChange={alterarEdicao}
                />
              </div>

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
                  onClick={fecharEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div
              className="modal-backdrop"
              onClick={() => !salvando && fecharEdicao()}
            />
          </div>
        )}
      </div>
    </div>
  );
}