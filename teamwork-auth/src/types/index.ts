// User interface for Teamwork users
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

// Auth context interface for React components
export interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  getAccessToken: () => string | null;
}

// Login result interface
export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Login component props interface
export interface LoginProps {
  clientID?: string;
  redirectURI?: string;
  clientSecret?: string;
}
