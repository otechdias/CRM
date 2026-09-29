"use client";

import { createContext, useContext } from "react";
import type { Role } from "../lib/permissoes";

interface AuthContextValue {
  role: Role | null;
  nome: string | null;
}

export const AuthContext = createContext<AuthContextValue>({ role: null, nome: null });
export const useAuth = () => useContext(AuthContext);