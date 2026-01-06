import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Ticket, TicketStatus } from '../types';

const COLLECTION_NAME = 'tickets';

/**
 * Adiciona um novo ticket ao Firestore
 */
export const addTicket = async (ticket: Omit<Ticket, 'id'>): Promise<Ticket> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...ticket,
      createdAt: new Date().toISOString()
    });
    
    return {
      ...ticket,
      id: docRef.id
    } as Ticket;
  } catch (error) {
    console.error('Erro ao adicionar ticket:', error);
    throw error;
  }
};

/**
 * Busca todos os tickets do Firestore
 */
export const getAllTickets = async (): Promise<Ticket[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Ticket[];
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    return [];
  }
};

/**
 * Atualiza o status de um ticket
 */
export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
  try {
    const ticketRef = doc(db, COLLECTION_NAME, ticketId);
    await updateDoc(ticketRef, { 
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar ticket:', error);
    throw error;
  }
};

/**
 * Remove um ticket do Firestore
 */
export const deleteTicket = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, COLLECTION_NAME, ticketId);
    await deleteDoc(ticketRef);
  } catch (error) {
    console.error('Erro ao remover ticket:', error);
    throw error;
  }
};

/**
 * Listener em tempo real para mudanças nos tickets
 */
export const subscribeToTickets = (callback: (tickets: Ticket[]) => void): Unsubscribe => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const tickets = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Ticket[];
    
    callback(tickets);
  }, (error) => {
    console.error('Erro no listener de tickets:', error);
  });
};
