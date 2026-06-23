import React, { createContext, useContext, type ReactNode } from "react";
import useAuthSessionViewModel, {
  type AuthSessionViewModel,
} from "../viewModels/auth/useAuthSessionViewModel";

export type AuthContextValue = AuthSessionViewModel;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  //tracks if a user is logged in, handling token updates, and validating sessions
  const auth = useAuthSessionViewModel();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) as AuthContextValue;
}
