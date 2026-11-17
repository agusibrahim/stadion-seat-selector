import type { CategoryId, TicketCategory } from '../types/stadium';

export const MATCH_INFO = {
  homeTeam: 'Persib',
  awayTeam: 'Persija',
  title: 'Persib – Persija',
  subtitle: 'Gelora Bung Karno · Sat 23 May · 19:00',
  venueName: 'Gelora Bung Karno Main Stadium',
  venueCity: 'Senayan, Jakarta',
  kickoffTime: '19:00',
  scoreboardTime: '19:00',
  stageTitle: 'THE CLASSIC · GBK JAKARTA',
  startingPriceFormatted: 'Rp125k',
} as const;

export const TICKET_CATEGORIES: Record<CategoryId, TicketCategory> = {
  1: {
    id: 1,
    label: 'VIP',
    price: 450000,
    shortPrice: 'Rp450k',
    fullPrice: 'Rp450k',
    mapColor: '#52495C',
    hoverColor: '#665B73',
    dotColor: '#635770',
  },
  2: {
    id: 2,
    label: 'Cat 1',
    price: 250000,
    shortPrice: 'Rp250k',
    fullPrice: 'Rp250k',
    mapColor: '#383A45',
    hoverColor: '#484B59',
    dotColor: '#434654',
  },
  3: {
    id: 3,
    label: 'Cat 2',
    price: 125000,
    shortPrice: 'Rp125k',
    fullPrice: 'Rp125k',
    mapColor: '#252730',
    hoverColor: '#333642',
    dotColor: '#2D303B',
  },
};

export const CATEGORY_LIST: TicketCategory[] = [
  TICKET_CATEGORIES[1],
  TICKET_CATEGORIES[2],
  TICKET_CATEGORIES[3],
];
