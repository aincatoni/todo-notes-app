import { useCallback, useEffect, useState } from 'react';
import { authService } from '../composition';
import { isAppError } from '../domain/errors';
import { AuthState } from '../services/authService';
import { Session, User } from '../types/auth';

export interface UseAuthResult {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  submitting: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    password: string,
    displayName?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  checkPendingSync: () => Promise<boolean>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [authState, setAuthState] = useState<AuthState>(() => ({
    user: authService.getCurrentUser(),
    session: authService.getCurrentSession(),
  }));
  const [initializing, setInitializing] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = authService.subscribe((next) => {
      if (isMounted) {
        setAuthState(next);
      }
    });

    (async () => {
      try {
        const restored = await authService.restoreSession();
        if (isMounted && restored) {
          setAuthState({
            user: restored.user,
            session: restored.session,
          });
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setSubmitting(true);
      setError(null);
      try {
        await authService.login(username, password);
        return true;
      } catch (err) {
        setError(
          isAppError(err) ? err.message : 'No se pudo iniciar sesión.'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const register = useCallback(
    async (
      username: string,
      password: string,
      displayName?: string
    ): Promise<boolean> => {
      setSubmitting(true);
      setError(null);
      try {
        await authService.register({ username, password, displayName });
        return true;
      } catch (err) {
        setError(
          isAppError(err) ? err.message : 'No se pudo crear la cuenta.'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    await authService.logout();
  }, []);

  const checkPendingSync = useCallback(async (): Promise<boolean> => {
    return await authService.hasPendingSync();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    initializing,
    submitting,
    error,
    login,
    register,
    logout,
    checkPendingSync,
    clearError,
  };
}
