import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { AuthenticatedUser, UserRole } from '../types';

const COLLECTION_NAME = 'users';

/**
 * Cria ou atualiza um usuário no Firestore
 */
export const createOrUpdateUser = async (user: AuthenticatedUser): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, user.uid);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário:', error);
    throw error;
  }
};

/**
 * Busca um usuário pelo UID
 */
export const getUserByUid = async (uid: string): Promise<AuthenticatedUser | null> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as AuthenticatedUser;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
};

/**
 * Busca um usuário pelo email
 */
export const getUserByEmail = async (email: string): Promise<AuthenticatedUser | null> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as AuthenticatedUser;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }
};

/**
 * Lista todos os usuários (apenas para admins)
 */
export const getAllUsers = async (): Promise<AuthenticatedUser[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as AuthenticatedUser);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
};

/**
 * Lista usuários por role
 */
export const getUsersByRole = async (role: UserRole): Promise<AuthenticatedUser[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as AuthenticatedUser);
  } catch (error) {
    console.error('Erro ao listar usuários por role:', error);
    return [];
  }
};

/**
 * Atualiza a role de um usuário
 */
export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, { 
      role,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar role do usuário:', error);
    throw error;
  }
};

/**
 * Ativa ou desativa um usuário
 */
export const setUserActiveStatus = async (uid: string, isActive: boolean): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, { 
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    throw error;
  }
};

/**
 * Atualiza o último login do usuário
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, { 
      lastLoginAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar último login:', error);
    // Não lançar erro para não interromper o login
  }
};

/**
 * Remove um usuário (soft delete - apenas desativa)
 */
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(userRef, { 
      isActive: false,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    throw error;
  }
};

/**
 * Remove permanentemente um usuário (hard delete)
 */
export const permanentlyDeleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Erro ao remover permanentemente usuário:', error);
    throw error;
  }
};

/**
 * Listener em tempo real para mudanças em usuários
 */
export const subscribeToUsers = (callback: (users: AuthenticatedUser[]) => void): Unsubscribe => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => doc.data() as AuthenticatedUser);
    callback(users);
  }, (error) => {
    console.error('Erro no listener de usuários:', error);
  });
};

/**
 * Verifica se um usuário tem permissão para uma ação
 */
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.OPERATOR]: 2,
    [UserRole.MANAGER]: 3,
    [UserRole.ADMIN]: 4
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Verifica se o usuário é admin
 */
export const isAdmin = (role: UserRole): boolean => {
  return role === UserRole.ADMIN;
};

/**
 * Verifica se o usuário pode gerenciar eventos
 */
export const canManageEvents = (role: UserRole): boolean => {
  return hasPermission(role, UserRole.MANAGER);
};

/**
 * Verifica se o usuário pode operar catracas
 */
export const canOperateGate = (role: UserRole): boolean => {
  return hasPermission(role, UserRole.OPERATOR);
};
