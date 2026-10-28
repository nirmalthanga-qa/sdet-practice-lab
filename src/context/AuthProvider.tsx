import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthState, AuthUser } from './AuthContext';

type AuthProviderProps = {
  children: ReactNode;
};

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'fullName' in value &&
    typeof value.fullName === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

export default function AuthProvider({
  children,
}: AuthProviderProps) {
  const [authState, setAuthState] =
    useState<AuthState>({ status: 'loading' });

  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.status === 401) {
          if (!controller.signal.aborted) {
            setAuthState({ status: 'anonymous' });
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            `Session request failed: ${response.status}`,
          );
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('user' in data) ||
          !isAuthUser(data.user)
        ) {
          throw new Error('Invalid session response');
        }

        if (!controller.signal.aborted) {
          setAuthState({
            status: 'authenticated',
            user: data.user,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setAuthState({
            status: 'error',
            message:
              'We couldn’t check your sign-in status. Please try again.',
          });
        }
      }
    }

    void checkSession();

    return () => controller.abort();
  }, [requestVersion]);

  function refreshAuth() {
    setAuthState({ status: 'loading' });
    setRequestVersion((current) => current + 1);
  }

  return (
    <AuthContext.Provider value={{ authState, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}