export enum TicketStatus {
  PENDING_PAYMENT = 'AGUARDANDO_PAGAMENTO',
  PAID_PENDING_FACE = 'PAGO_AGUARDANDO_ROSTO',
  ACTIVE = 'ATIVO',
  USED = 'UTILIZADO',
  EXPIRED = 'EXPIRADO'
}

export enum TicketType {
  FREE = 'GRATUITO',
  STANDARD = 'PADRAO',
  VIP = 'VIP',
  BACKSTAGE = 'BACKSTAGE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  image: string;
  isFree: boolean;
  price: number;
  maxCapacity: number;
  currentAttendees: number;
  isActive: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  user: User;
  type: TicketType;
  price: number;
  status: TicketStatus;
  purchaseDate: string;
  faceImageBase64?: string; // The registered face
}

export interface VerificationResult {
  match: boolean;
  ticket?: Ticket;
  confidence: string;
  message: string;
}