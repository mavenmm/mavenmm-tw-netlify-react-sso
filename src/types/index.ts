export interface SSOConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
  teamworkDomain?: string;
  netlifyFunctionsUrl: string;
  storageKey?: string;
  clientSecret?: string; // Optional: Only needed for custom implementations
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  teamworkUserId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  error: string | null;
}

export interface SSOContextValue extends AuthState {
  login: (redirectTo?: string) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

export interface NetlifyFunctionEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  origin?: string;
}

export interface NetlifyFunctionResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export interface TeamworkAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  company: {
    id: number;
    name: string;
    logo: string;
  };
}

export interface MavenSSOConfig {
  clientId: string;
  redirectUri?: string;
  allowedOrigins?: string[];
  devId?: string;
}

export interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface ValidationResult {
  status: string;
  code: number;
  message: string;
  options?: {
    headers: {
      teamworkUserID?: string;
      Authorization: string;
    };
  } | null;
}
