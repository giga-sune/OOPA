import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";

import { subscribeToAuthSession } from "../../services/auth/authService";

export interface AuthSessionViewModel {
  user: User | null;
  initializing: boolean;
  isAuthenticated: boolean;
}

export default function useAuthSessionViewModel(): AuthSessionViewModel {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession((nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

  return {
    user,
    initializing,
    isAuthenticated,
  };
}
