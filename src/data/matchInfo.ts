import type { CategoryId, TicketCategory } from '../types/stadium';

export const MATCH_INFO = {
  homeTeam: 'Persib',
  awayTeam: 'Persija',
  title: 'Persib – Persija',
  subtitle: 'Stadion Utama GBK · Sab 23 Mei · 19:00 WIB',
  venueName: 'Stadion Utama Gelora Bung Karno',
  venueCity: 'Senayan, Jakarta',
  kickoffTime: '19:00 WIB',
  scoreboardTime: '19:00',
  stageTitle: 'EL CLASICO INDONESIA',
  startingPriceFormatted: 'Rp125.000',
} as const;

export const TICKET_CATEGORIES: Record<CategoryId, TicketCategory> = {
  1: {
    id: 1,
    label: 'VIP',
    price: 450000,
    shortPrice: 'Rp450rb',
    fullPrice: 'Rp450.000',
    mapColor: '#52495C',
    hoverColor: '#665B73',
    dotColor: '#635770',
  },
  2: {
    id: 2,
    label: 'Cat 1',
    price: 250000,
    shortPrice: 'Rp250rb',
    fullPrice: 'Rp250.000',
    mapColor: '#383A45',
    hoverColor: '#484B59',
    dotColor: '#434654',
  },
  3: {
    id: 3,
    label: 'Cat 2',
    price: 125000,
    shortPrice: 'Rp125rb',
    fullPrice: 'Rp125.000',
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
