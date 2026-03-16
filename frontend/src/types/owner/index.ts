export interface Shop {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  storefrontImage: string;
  contactDetails: {
    phone: string;
    email: string;
    address: string;
  };
  inventory: Item[];
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  stock: number;
  image?: string;
}

export type ActiveTab = 'shops' | 'add-item' | 'inventory' | 'add-shop' | 'inquiries' | 'edit-shop';

export interface NewItemForm {
  name: string;
  price: string;
  description: string;
  category: string;
  stock: string;
}
