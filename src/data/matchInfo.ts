import type { CategoryId, TicketCategory } from '../types/stadium';

export const MATCH_INFO = {
  homeTeam: 'Barcelona',
  awayTeam: 'Milan',
  title: 'Barcelona – Milan',
  subtitle: 'Final · Sat 23 May · 20:45',
  kickoffTime: '20:45',
  stageTitle: 'THE FINAL',
  currency: '€',
  startingPrice: 65,
} as const;

export const TICKET_CATEGORIES: Record<CategoryId, TicketCategory> = {
  1: {
    id: 1,
    label: 'Cat 1',
    price: 190,
    mapColor: '#484A54',
    hoverColor: '#585B67',
    dotColor: '#525460',
  },
  2: {
    id: 2,
    label: 'Cat 2',
    price: 120,
    mapColor: '#353740',
    hoverColor: '#444752',
    dotColor: '#3E404A',
  },
  3: {
    id: 3,
    label: 'Cat 3',
    price: 65,
    mapColor: '#25272F',
    hoverColor: '#333641',
    dotColor: '#2B2D36',
  },
};

export const CATEGORY_LIST: TicketCategory[] = [
  TICKET_CATEGORIES[1],
  TICKET_CATEGORIES[2],
  TICKET_CATEGORIES[3],
];
