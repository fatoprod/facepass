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

// Roles de usuário para controle de acesso
export enum UserRole {
  USER = 'USER',           // Usuário comum (compra ingressos)
  OPERATOR = 'OPERATOR',   // Operador de catraca
  MANAGER = 'MANAGER',     // Gerente de eventos
  ADMIN = 'ADMIN'          // Administrador do sistema
}

// Interface básica para usuário em tickets (sem autenticação)
export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
}

// Interface completa para usuários autenticados
export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  cpf?: string;
  phone?: string;
  photoURL?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
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
  faceImageBase64?: string; // Legacy: base64 encoded face image (in-memory only)
  faceImageUrl?: string;    // Firebase Storage URL for the face image
}

export interface VerificationResult {
  match: boolean;
  ticket?: Ticket;
  confidence: string;
  message: string;
}