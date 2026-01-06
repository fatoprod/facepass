import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthenticatedUser, UserRole } from '../types';
import { 
  getUserByUid, 
  createOrUpdateUser, 
  updateLastLogin,
  hasPermission,
  canManageEvents,
  canOperateGate
} from '../services/userService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  userEmail: string | null;
  // Permissões
  isAdmin: boolean;
  canManageEvents: boolean;
  canOperateGate: boolean;
  hasPermission: (requiredRole: UserRole) => boolean;
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
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Listener para mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        
        // Buscar dados do usuário no Firestore
        let userData = await getUserByUid(fbUser.uid);
        
        // Se não existir no Firestore, criar com role padrão
        if (!userData) {
          userData = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Usuário',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await createOrUpdateUser(userData);
        }
        
        // Verificar se usuário está ativo
        if (!userData.isActive) {
          await signOut(auth);
          setIsAuthenticated(false);
          setUser(null);
          setFirebaseUser(null);
          setIsLoading(false);
          return;
        }
        
        // Atualizar último login
        await updateLastLogin(fbUser.uid);
        
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar se o usuário existe e está ativo no Firestore
      const userData = await getUserByUid(userCredential.user.uid);
      
      if (userData && !userData.isActive) {
        await signOut(auth);
        return { success: false, error: 'Usuário desativado. Entre em contato com o administrador.' };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      // Mapear erros do Firebase para mensagens amigáveis
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/invalid-credential': 'Email ou senha inválidos'
      };
      
      return { 
        success: false, 
        error: errorMessages[error.code] || 'Erro ao fazer login'
      };
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar o displayName no Firebase Auth
      await updateProfile(userCredential.user, { displayName });
      
      // Criar usuário no Firestore
      const newUser: AuthenticatedUser = {
        uid: userCredential.user.uid,
        email: email,
        displayName: displayName,
        role: UserRole.USER, // Novo usuário sempre começa como USER
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await createOrUpdateUser(newUser);
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Este email já está em uso',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres'
      };
      
      return { 
        success: false, 
        error: errorMessages[error.code] || 'Erro ao criar conta'
      };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Funções de permissão
  const checkPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return hasPermission(user.role, requiredRole);
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    firebaseUser,
    login,
    register,
    logout,
    userEmail: user?.email || null,
    isAdmin: user?.role === UserRole.ADMIN,
    canManageEvents: user ? canManageEvents(user.role) : false,
    canOperateGate: user ? canOperateGate(user.role) : false,
    hasPermission: checkPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
