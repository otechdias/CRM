import Link from "next/link";

export interface ProximaAcao {
  origem: "lead" | "cliente";
  id: number;
  empresa: string | null;
  responsavel: string | null;
  acao: string | null;
  data: string | null;
  horario: string | null;
  prioridade: string | null;
  status: string | null;
  atrasada: boolean;
}

const formatarData = (data: string | null) => {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
};

export default function ProximasAcoesTabela({
  itens,
}: {
  itens: ProximaAcao[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Empresa</th>
            <th>Ação</th>
            <th>Responsável</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {itens.map((item) => (
            <tr key={`${item.origem}-${item.id}`}>
              <td className="whitespace-nowrap">
                <div className="font-medium">{formatarData(item.data)}</div>

                {item.horario && (
                  <div className="text-xs text-base-content/60">
                    {item.horario}
                  </div>
                )}

                {item.atrasada && (
                  <span className="badge badge-error badge-sm mt-1">
                    Atrasada
                  </span>
                )}
              </td>

              <td>
                <div className="font-medium">{item.empresa || "-"}</div>
                <div className="text-xs text-base-content/60">
                  {item.origem === "lead" ? "Lead" : "Cliente"}
                </div>
              </td>

              <td>{item.acao || "-"}</td>
              <td>{item.responsavel || "-"}</td>

              <td>
                {item.prioridade ? (
                  <span className="badge badge-outline">{item.prioridade}</span>
                ) : (
                  "-"
                )}
              </td>

              <td>
                {item.status ? (
                  <span className="badge badge-outline">{item.status}</span>
                ) : (
                  "-"
                )}
              </td>

              <td>
                <Link
                  className="btn btn-warning btn-xs"
                  href={
                    item.origem === "lead"
                      ? `/crm/leads?editar=${item.id}`
                      : `/crm/clientes?editar=${item.id}`
                  }
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}