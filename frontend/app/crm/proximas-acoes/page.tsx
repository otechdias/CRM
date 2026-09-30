"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import Navbar from "../../../components/Navbar";
import { navigateWithFilter } from "../../../lib/dashboardTheme";

interface ProximaAcao {
  origem: "lead" | "cliente" | string;
  id: number;
  lead_id?: number | null;
  cliente_id?: number | null;
  empresa: string | null;
  responsavel: string | null;
  acao: string | null;
  data: string | null;
  horario: string | null;
  prioridade: string | null;
  status: string | null;
  atrasada?: boolean;
}

const formatarData = (data?: string | null) => {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
};

const getPrioridadeBadgeClass = (prioridade?: string | null) => {
  switch (prioridade) {
    case "Baixa": return "badge badge-ghost";
    case "Normal": return "badge badge-info";
    case "Alta": return "badge badge-warning";
    case "Urgente": return "badge badge-error";
    default: return "badge badge-outline";
  }
};

export default function ProximasAcoesPage() {
  const [acoes, setAcoes] = useState<ProximaAcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [apenasAtrasadas, setApenasAtrasadas] = useState(false);
  const [hoje] = useState(() => new Date().toISOString().slice(0, 10));

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const params: Record<string, string> = {};
      if (busca.trim()) params.busca = busca.trim();
      if (responsavel) params.responsavel = responsavel;
      if (prioridade) params.prioridade = prioridade;
      if (apenasAtrasadas) params.atrasadas = "1";

      const res = await api.get("/proximas-acoes/", { params });
      setAcoes(res.data);
    } catch (error) {
      console.error("Erro ao carregar próximas ações:", error);
      setErro("Não foi possível carregar as próximas ações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const responsaveis = useMemo(
    () => Array.from(new Set(acoes.map((a) => a.responsavel).filter(Boolean) as string[])).sort(),
    [acoes]
  );

  const abrirOrigem = (item: ProximaAcao) => {
    if (item.origem === "lead") {
      navigateWithFilter("/crm/leads", { editar: String(item.id) });
    } else if (item.origem === "cliente") {
      navigateWithFilter("/crm/clientes", { editar: String(item.id) });
    } else if (item.lead_id) {
      navigateWithFilter("/crm/leads", { editar: String(item.lead_id) });
    } else if (item.cliente_id) {
      navigateWithFilter("/crm/clientes", { editar: String(item.cliente_id) });
    }
  };

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold">Próximas Ações</h2>
            <p className="text-base-content/60 mt-1">
              Todos os contatos e atividades comerciais agendadas.
            </p>
          </div>
          <div className="badge badge-lg">
            {acoes.length} {acoes.length === 1 ? "ação" : "ações"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <input
            className="input input-bordered lg:col-span-2"
            placeholder="Buscar por empresa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && carregar()}
          />
          <select className="select select-bordered" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="select select-bordered" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
            <option value="">Todas as prioridades</option>
            <option value="Baixa">Baixa</option>
            <option value="Normal">Normal</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>
          <label className="label cursor-pointer justify-start gap-2 border border-base-300 rounded-lg px-3">
            <input type="checkbox" className="checkbox checkbox-sm" checked={apenasAtrasadas} onChange={(e) => setApenasAtrasadas(e.target.checked)} />
            <span className="label-text">Só atrasadas</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <button className="btn btn-primary btn-sm" onClick={carregar}>Aplicar filtros</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setBusca(""); setResponsavel(""); setPrioridade(""); setApenasAtrasadas(false); setTimeout(carregar, 0); }}
          >
            Limpar
          </button>
        </div>

        {erro && (
          <div className="alert alert-error mb-4">
            <span>{erro}</span>
            <button className="btn btn-sm" onClick={carregar}>Tentar novamente</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>
        ) : acoes.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body items-center text-center py-16">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="text-xl font-semibold">Nenhuma próxima ação</h3>
              <p className="text-base-content/60">Não existem ações agendadas para os filtros atuais.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr><th>Data</th><th>Origem</th><th>Empresa</th><th>Ação</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {acoes.map((item, index) => {
                  const atrasada = item.atrasada ?? (!!item.data && item.data < hoje && item.acao !== "Nenhuma");
                  return (
                    <tr key={`${item.origem}-${item.id}-${index}`}>
                      <td className="whitespace-nowrap">
                        <div className="font-medium">{formatarData(item.data)}</div>
                        {item.horario && <div className="text-xs text-base-content/60">{item.horario}</div>}
                        {atrasada && <span className="badge badge-error badge-sm mt-1">Atrasada</span>}
                      </td>
                      <td>
                        <span className={item.origem === "lead" ? "badge badge-info badge-outline" : "badge badge-secondary badge-outline"}>
                          {item.origem === "lead" ? "Lead" : "Cliente"}
                        </span>
                      </td>
                      <td className="font-medium">{item.empresa || "-"}</td>
                      <td>{item.acao || "-"}</td>
                      <td>{item.responsavel || "-"}</td>
                      <td>{item.prioridade ? <span className={getPrioridadeBadgeClass(item.prioridade)}>{item.prioridade}</span> : "-"}</td>
                      <td>{item.status || "-"}</td>
                      <td><button className="btn btn-warning btn-xs" onClick={() => abrirOrigem(item)}>Abrir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}