import Link from "next/link";

export default function Navbar() {
  return (
    <div className="navbar bg-base-200 px-4">
      <div className="flex-1">
        <h1 className="text-xl font-bold">TechDias CRM</h1>
      </div>

      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/crm/clientes">
              Clientes
            </Link>
          </li>

          <li>
            <Link href="/crm/leads">
              Leads
            </Link>
          </li>

          <li>
            <Link href="/crm/projetos">
              Projetos
            </Link>
          </li>

          <li>
            <Link href="/crm/pagamentos">
              Pagamentos
            </Link>
          </li>

          <li>
            <Link href="/crm/planos">
              Planos
            </Link>
          </li>

          <li>
            <Link href="/crm/interacoes">
              Interações
            </Link>
          </li>

          <li>
            <Link href="/crm/script">
              Script
            </Link>
          </li>

          <li>
            <Link href="/crm/dashboard">
              Dashboard
            </Link>
          </li>

        </ul>
      </div>
    </div>
  );
}