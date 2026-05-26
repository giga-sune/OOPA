import { useEffect, useMemo, useState } from "react";

import { subscribeToAuthSession } from "../../services/auth/authService";

export default function useAuthSessionViewModel() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

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
