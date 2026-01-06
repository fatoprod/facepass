import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Credenciais master - Em produção, usar Firebase Auth ou similar
const MASTER_CREDENTIALS = {
  email: 'admin@facepass.com',
  password: 'FacePass@2025'
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  userEmail: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Verificar se há sessão salva no localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem('facepass_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        // Verificar se a sessão não expirou (24 horas)
        if (authData.timestamp && Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true);
          setUserEmail(authData.email);
        } else {
          localStorage.removeItem('facepass_auth');
        }
      } catch (e) {
        localStorage.removeItem('facepass_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === MASTER_CREDENTIALS.email && password === MASTER_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setUserEmail(email);
      
      // Salvar sessão no localStorage
      localStorage.setItem('facepass_auth', JSON.stringify({
        email,
        timestamp: Date.now()
      }));

      return { success: true };
    }

    return { success: false, error: 'Email ou senha inválidos' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail(null);
    localStorage.removeItem('facepass_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, userEmail }}>
      {children}
    </AuthContext.Provider>
  );
};
