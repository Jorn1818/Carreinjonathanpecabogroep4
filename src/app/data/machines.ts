import { Machine } from '@/app/types';

export const machines: Machine[] = [
  {
    id: 'exc-1',
    name: 'Graafmachine 20 ton',
    category: 'graafmachine',
    description: 'Krachtige graafmachine voor grote grondwerkzaamheden. Ideaal voor uitgraven van funderingen, aanleggen van rioleringen en terreinafgraving.',
    image: 'https://images.unsplash.com/photo-1652922660696-60c68ec51582?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGNhdmF0b3IlMjBjb25zdHJ1Y3Rpb258ZW58MXx8fHwxNzY5MTU1NTY3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 350,
    pricePerWeek: 1750,
    specifications: {
      weight: '20 ton',
      power: '148 kW',
      capacity: '1.0 m³',
      reach: '10 meter'
    },
    accessories: [
      {
        id: 'acc-1',
        name: 'Graafbak 60cm',
        description: 'Standaard graafbak voor algemeen graafwerk',
        pricePerDay: 25
      },
      {
        id: 'acc-2',
        name: 'Graafbak 120cm',
        description: 'Brede graafbak voor grotere volumes',
        pricePerDay: 35
      },
      {
        id: 'acc-3',
        name: 'Kantelbak',
        description: 'Kantelbare bak voor taluds en sloten',
        pricePerDay: 45
      }
    ],
    availability: true
  },
  {
    id: 'mini-1',
    name: 'Minigraver 1.5 ton',
    category: 'minigraver',
    description: 'Compacte minigraver perfect voor kleinere werkzaamheden in tuinen en krappe ruimtes. Gemakkelijk te transporteren.',
    image: 'https://images.unsplash.com/photo-1690719495572-bc42843eae29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pJTIwZXhjYXZhdG9yfGVufDF8fHx8MTc2OTA3NDY4OXww&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 120,
    pricePerWeek: 550,
    specifications: {
      weight: '1.5 ton',
      power: '14 kW',
      capacity: '0.04 m³',
      reach: '3 meter'
    },
    accessories: [
      {
        id: 'acc-4',
        name: 'Graafbak 30cm',
        description: 'Smalle bak voor sleufwerk',
        pricePerDay: 15
      },
      {
        id: 'acc-5',
        name: 'Graafbak 60cm',
        description: 'Standaard bak voor algemeen werk',
        pricePerDay: 20
      }
    ],
    availability: true
  },
  {
    id: 'dump-1',
    name: 'Dumper 3 ton',
    category: 'dumper',
    description: 'Robuuste dumper voor transport van grond, puin en materialen over het terrein. Met kantelbare bak voor eenvoudig lossen.',
    image: 'https://images.unsplash.com/photo-1723369962510-e1bf627435e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBkdW1wZXIlMjB0cnVja3xlbnwxfHx8fDE3NjkxNTU1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 95,
    pricePerWeek: 450,
    specifications: {
      weight: '1.2 ton',
      power: '18 kW',
      capacity: '3 ton laadvermogen'
    },
    availability: true
  },
  {
    id: 'crane-1',
    name: 'Kraan 10 ton',
    category: 'kraan',
    description: 'Mobiele kraan voor het hijsen en plaatsen van zware materialen. Geschikt voor diverse bouwprojecten.',
    image: 'https://images.unsplash.com/photo-1535732759880-bbd5c7265e3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmFuZSUyMGNvbnN0cnVjdGlvbnxlbnwxfHx8fDE3NjkxNTU1Njh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 450,
    pricePerWeek: 2250,
    specifications: {
      weight: '18 ton',
      power: '180 kW',
      capacity: '10 ton hijsvermogen',
      reach: '30 meter'
    },
    accessories: [
      {
        id: 'acc-6',
        name: 'Hijshaak 5 ton',
        description: 'Standaard hijshaak',
        pricePerDay: 30
      },
      {
        id: 'acc-7',
        name: 'Hefbalk',
        description: 'Voor het hijsen van langerekte materialen',
        pricePerDay: 50
      }
    ],
    availability: true
  },
  {
    id: 'mini-2',
    name: 'Minigraver 3 ton',
    category: 'minigraver',
    description: 'Iets grotere minigraver met meer vermogen. Geschikt voor middelgrote graafprojecten.',
    image: 'https://images.unsplash.com/photo-1690719495572-bc42843eae29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pJTIwZXhjYXZhdG9yfGVufDF8fHx8MTc2OTA3NDY4OXww&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 180,
    pricePerWeek: 850,
    specifications: {
      weight: '3 ton',
      power: '20 kW',
      capacity: '0.12 m³',
      reach: '4.5 meter'
    },
    availability: true
  },
  {
    id: 'exc-2',
    name: 'Graafmachine 14 ton',
    category: 'graafmachine',
    description: 'Veelzijdige graafmachine voor middelgrote tot grote projecten. Uitstekende balans tussen kracht en wendbaarheid.',
    image: 'https://images.unsplash.com/photo-1652922660696-60c68ec51582?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGNhdmF0b3IlMjBjb25zdHJ1Y3Rpb258ZW58MXx8fHwxNzY5MTU1NTY3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    pricePerDay: 280,
    pricePerWeek: 1400,
    specifications: {
      weight: '14 ton',
      power: '88 kW',
      capacity: '0.6 m³',
      reach: '8 meter'
    },
    availability: false
  }
];
