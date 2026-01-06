import { TicketType } from './types';

export const EVENT_INFO = {
  name: "TechFuture Summit 2025",
  date: "15 de Novembro, 2025",
  location: "Expo Center Norte, São Paulo",
  image: "https://picsum.photos/1200/400"
};

export const TICKET_PRICES = {
  [TicketType.FREE]: 0,
  [TicketType.STANDARD]: 150.00,
  [TicketType.VIP]: 450.00,
  [TicketType.BACKSTAGE]: 1200.00
};

export const MOCK_INITIAL_TICKETS = []; // Start empty, users will add to this
