export type Role = "admin" | "vendedora";

export interface ItemMenu {
  chave: string;
  label: string;
  href: string;
}

export const TODOS_ITENS_MENU: ItemMenu[] = [
  { chave: "dashboard", label: "Dashboard", href: "/crm/dashboard" },
  { chave: "clientes", label: "Clientes", href: "/crm/clientes" },
  { chave: "leads", label: "Leads", href: "/crm/leads" },
  { chave: "projetos", label: "Projetos", href: "/crm/projetos" },
  { chave: "pagamentos", label: "Pagamentos", href: "/crm/pagamentos" },
  { chave: "planos", label: "Planos", href: "/crm/planos" },
  { chave: "interacoes", label: "Interações", href: "/crm/interacoes" },
  { chave: "proximas-acoes", label: "Próximas Ações", href: "/crm/proximas-acoes" },
  { chave: "script", label: "Script", href: "/crm/script" },
];

// ÚNICO lugar a editar para mudar quem vê o quê (ou criar um papel novo)
export const PERMISSOES: Record<Role, string[]> = {
  admin: TODOS_ITENS_MENU.map((item) => item.chave),
  vendedora: ["leads", "script"],
};

export const itensMenuPermitidos = (role: Role | null): ItemMenu[] => {
  if (!role) return [];
  const permitidas = PERMISSOES[role] ?? [];
  return TODOS_ITENS_MENU.filter((item) => permitidas.includes(item.chave));
};

export const rotaPermitida = (role: Role | null, pathname: string): boolean => {
  if (!role) return false;
  const item = TODOS_ITENS_MENU.find((i) => pathname.startsWith(i.href));
  if (!item) return true; // rota fora do menu (ex: "/") não é bloqueada aqui
  return (PERMISSOES[role] ?? []).includes(item.chave);
};

export const primeiraRotaPermitida = (role: Role | null): string =>
  itensMenuPermitidos(role)[0]?.href ?? "/login";