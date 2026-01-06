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
import { uploadFaceImage, deleteFaceImage } from './storageService';

const COLLECTION_NAME = 'tickets';

/**
 * Adiciona um novo ticket ao Firestore
 * Se houver uma imagem facial em base64, faz upload para o Storage primeiro
 */
export const addTicket = async (ticket: Omit<Ticket, 'id'>): Promise<Ticket> => {
  try {
    // Prepare ticket data without base64 image
    const { faceImageBase64, ...ticketData } = ticket as any;
    
    // First, create the ticket document to get the ID
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...ticketData,
      createdAt: new Date().toISOString()
    });
    
    let faceImageUrl: string | undefined;
    
    // If there's a base64 image, upload it to Storage
    if (faceImageBase64) {
      try {
        faceImageUrl = await uploadFaceImage(faceImageBase64, ticket.eventId, docRef.id);
        
        // Update the ticket with the image URL
        await updateDoc(docRef, { faceImageUrl });
      } catch (uploadError) {
        console.error('Erro ao fazer upload da imagem facial:', uploadError);
        // Continue without the image URL - ticket is still valid
      }
    }
    
    return {
      ...ticketData,
      id: docRef.id,
      faceImageUrl
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
 * Remove um ticket do Firestore e sua imagem do Storage
 */
export const deleteTicket = async (ticketId: string, eventId?: string): Promise<void> => {
  try {
    // Delete face image from Storage if eventId is provided
    if (eventId) {
      await deleteFaceImage(eventId, ticketId);
    }
    
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
