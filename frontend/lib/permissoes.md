Como adicionar um novo papel depois

Só 2 passos:

frontend/lib/permissoes.ts: adicione o nome na union Role e uma entrada em PERMISSOES listando as chaves (de TODOS_ITENS_MENU) que esse papel pode ver. Nada mais no front muda — Navbar, AuthGuard e a home lêem tudo daqui.
Supabase: dê esse valor de role para os usuários certos na tabela perfis (Table Editor ou SQL).

Ex.: um papel "financeiro" que só vê Pagamentos e Planos:

ts
export type Role = "admin" | "vendedora" | "financeiro";

export const PERMISSOES: Record<Role, string[]> = {
  admin: TODOS_ITENS_MENU.map((item) => item.chave),
  vendedora: ["leads", "script"],
  financeiro: ["pagamentos", "planos"],
};