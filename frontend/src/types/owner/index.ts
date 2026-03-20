// Owner-specific types and interfaces
export type ActiveTab = 'shops' | 'add-item' | 'inventory' | 'add-shop' | 'inquiries' | 'edit-shop';

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
