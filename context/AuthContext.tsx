import React, { createContext, useContext, type ReactNode } from "react";
import useAuthSessionViewModel, {
  type AuthSessionViewModel,
} from "../viewModels/auth/useAuthSessionViewModel";

export type AuthContextValue = AuthSessionViewModel;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthSessionViewModel();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) as AuthContextValue;
}
