import React, { createContext, useContext } from "react";
import useAuthSessionViewModel from "../viewModels/auth/useAuthSessionViewModel";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuthSessionViewModel();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}