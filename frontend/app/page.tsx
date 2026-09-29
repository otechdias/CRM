"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Target, Briefcase, CreditCard,
  Repeat, MessageSquare, FileText, Clock, ArrowRight,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { itensMenuPermitidos } from "../lib/permissoes";
import api from "../services/api";

const ICONES: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard, clientes: Users, leads: Target, projetos: Briefcase,
  pagamentos: CreditCard, planos: Repeat, interacoes: MessageSquare,
  "proximas-acoes": Clock, script: FileText,
};

const DESCRICOES: Record<string, string> = {
  dashboard: "Visão geral do CRM e indicadores comerciais.",
  clientes: "Gerencie empresas e contatos convertidos.",
  leads: "Acompanhe prospecções e oportunidades.",
  projetos: "Controle status, prazos e valores dos projetos.",
  pagamentos: "Gerencie cobranças, vencimentos e status.",
  planos: "Controle assinaturas e faturamento recorrente.",
  interacoes: "Registre contatos e atividades com leads e clientes.",
  "proximas-acoes": "Veja tudo que precisa ser feito nos próximos dias.",
  script: "Copie e utilize scripts prontos de alta conversão.",
};

interface ProximaAcao {
  origem: string; id: number; empresa: string | null; acao: string | null; data: string | null;
}

function PainelInicial() {
  const { role, nome } = useAuth();
  const itens = itensMenuPermitidos(role);
  const [acoes, setAcoes] = useState<ProximaAcao[]>([]);
  const [carregandoAcoes, setCarregandoAcoes] = useState(true);

  const temAcessoAcoes = itens.some((i) => i.chave === "proximas-acoes");

  useEffect(() => {
    if (!temAcessoAcoes) { setCarregandoAcoes(false); return; }
    api.get("/proximas-acoes/")
      .then((res) => setAcoes(res.data.slice(0, 5)))
      .catch(() => setAcoes([]))
      .finally(() => setCarregandoAcoes(false));
  }, [temAcessoAcoes]);

  return (
    <div>
      <Navbar />
      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{nome ? `Olá, ${nome}!` : "Bem-vindo ao TechDias CRM"}</h1>
          <p className="text-base-content/60 mt-1">Selecione uma seção abaixo para gerenciar seus dados.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {itens.map((item) => {
            const Icone = ICONES[item.chave] ?? FileText;
            return (
              <Link
                key={item.chave}
                href={item.href}
                className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-5 group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 text-primary rounded-xl p-3 group-hover:bg-primary group-hover:text-primary-content transition-colors">
                    <Icone size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{item.label}</h2>
                    <p className="text-sm text-base-content/60 mt-1">{DESCRICOES[item.chave]}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {temAcessoAcoes && (
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">Próximas Ações</h2>
                <Link href="/crm/proximas-acoes" className="btn btn-ghost btn-sm gap-1">
                  Ver todas <ArrowRight size={16} />
                </Link>
              </div>

              {carregandoAcoes ? (
                <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
              ) : acoes.length === 0 ? (
                <p className="text-base-content/60 py-4">Nenhuma ação agendada no momento.</p>
              ) : (
                <div className="divide-y divide-base-200 mt-2">
                  {acoes.map((item, index) => (
                    <div key={`${item.origem}-${item.id}-${index}`} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{item.empresa || "-"}</p>
                        <p className="text-sm text-base-content/60">{item.acao || "-"}</p>
                      </div>
                      <div className="text-sm text-base-content/60">
                        {item.data ? item.data.split("-").reverse().join("/") : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <PainelInicial />
    </AuthGuard>
  );
}