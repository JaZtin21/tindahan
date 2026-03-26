// Owner-specific types and interfaces
export type ActiveTab = 'shops' | 'add-item' | 'inventory' | 'add-shop' | 'inquiries' | 'edit-shop';

// Re-export Shop and Item types for convenience
export type { Shop } from '../shop';
export type { Item } from '../item';

export interface NewItemForm {
  name: string;
  price: string;
  description: string;
  category: string;
  stock: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  shops: string[]; // Array of shop IDs
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}
