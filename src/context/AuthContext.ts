import { createContext } from 'react';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'anonymous' }
  | { status: 'error'; message: string };

type AuthContextValue = {
  authState: AuthState;
  refreshAuth: () => void;
};

export const AuthContext =
  createContext<AuthContextValue | null>(null);