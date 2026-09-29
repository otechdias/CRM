"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { itensMenuPermitidos } from "../lib/permissoes";

export default function Navbar() {
  const { role } = useAuth();
  const pathname = usePathname();
  const itens = itensMenuPermitidos(role);

  return (
    <div className="navbar bg-base-200 px-4">
      <div className="flex-1">
        <Link href="/" className="text-xl font-bold">TechDias CRM</Link>
      </div>

      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          {itens.map((item) => (
            <li key={item.chave}>
              <Link href={item.href} className={pathname.startsWith(item.href) ? "active" : ""}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}