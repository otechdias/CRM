"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../contexts/AuthContext";
import { Role, rotaPermitida, primeiraRotaPermitida } from "../lib/permissoes";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [carregando, setCarregando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const carregarPerfil = async (userId: string) => {
    const { data } = await supabase
      .from("perfis")
      .select("role, nome")
      .eq("id", userId)
      .single();

    return { role: (data?.role as Role) ?? "vendedora", nome: data?.nome ?? null };
  };

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      const perfil = await carregarPerfil(session.user.id);
      if (!mounted) return;

      setRole(perfil.role);
      setNome(perfil.nome);
      setAutenticado(true);
      setCarregando(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session) {
        setAutenticado(false);
        setRole(null);
        router.replace("/login");
        return;
      }

      const perfil = await carregarPerfil(session.user.id);
      if (!mounted) return;

      setRole(perfil.role);
      setNome(perfil.nome);
      setAutenticado(true);
      setCarregando(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (carregando || !autenticado) return;
    if (!rotaPermitida(role, pathname)) {
      router.replace(primeiraRotaPermitida(role));
    }
  }, [carregando, autenticado, role, pathname, router]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!autenticado) return null;

  return <AuthContext.Provider value={{ role, nome }}>{children}</AuthContext.Provider>;
}