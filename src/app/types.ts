export interface Machine {
  id: string;
  name: string;
  category: 'graafmachine' | 'minigraver' | 'dumper' | 'kraan';
  description: string;
  image: string;
  pricePerDay: number;
  pricePerWeek: number;
  specifications: {
    weight?: string;
    power?: string;
    capacity?: string;
    reach?: string;
  };
  accessories?: Accessory[];
  availability: boolean;
}

export interface Accessory {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
}

export interface Booking {
  id: string;
  machineId: string;
  machineName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  accessories: string[];
  deliveryRequired: boolean;
  deliveryAddress?: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed';
  createdAt: string;
}
