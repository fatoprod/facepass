import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Event } from '../types';

const COLLECTION_NAME = 'events';

/**
 * Adiciona um novo evento ao Firestore
 */
export const addEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...event,
      createdAt: new Date().toISOString()
    });
    
    return {
      ...event,
      id: docRef.id
    } as Event;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    throw error;
  }
};

/**
 * Busca todos os eventos do Firestore
 */
export const getAllEvents = async (): Promise<Event[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Event[];
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
};

/**
 * Busca apenas eventos ativos
 */
export const getActiveEvents = async (): Promise<Event[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('isActive', '==', true),
      orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Event[];
  } catch (error) {
    console.error('Erro ao buscar eventos ativos:', error);
    return [];
  }
};

/**
 * Busca um evento por ID
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, eventId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id
      } as Event;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    return null;
  }
};

/**
 * Atualiza um evento existente
 */
export const updateEvent = async (eventId: string, data: Partial<Event>): Promise<void> => {
  try {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    await updateDoc(eventRef, { 
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    throw error;
  }
};

/**
 * Remove um evento do Firestore
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Erro ao remover evento:', error);
    throw error;
  }
};

/**
 * Incrementa o número de participantes de um evento
 */
export const incrementEventAttendees = async (eventId: string): Promise<void> => {
  try {
    const event = await getEventById(eventId);
    if (event) {
      await updateEvent(eventId, { 
        currentAttendees: event.currentAttendees + 1 
      });
    }
  } catch (error) {
    console.error('Erro ao incrementar participantes:', error);
    throw error;
  }
};

/**
 * Listener em tempo real para mudanças nos eventos
 */
export const subscribeToEvents = (callback: (events: Event[]) => void): Unsubscribe => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const events = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Event[];
    
    callback(events);
  }, (error) => {
    console.error('Erro no listener de eventos:', error);
  });
};

/**
 * Listener para eventos ativos
 */
export const subscribeToActiveEvents = (callback: (events: Event[]) => void): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('isActive', '==', true)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const events = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Event[];
    
    // Sort by date client-side since we can't combine where and orderBy on different fields without index
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    callback(events);
  }, (error) => {
    console.error('Erro no listener de eventos ativos:', error);
  });
};
