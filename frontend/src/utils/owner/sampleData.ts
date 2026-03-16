import type { Shop } from '../../types/owner';

export const sampleShops: Shop[] = [
  {
    id: '1',
    name: 'Mang Kiko\'s Sari-Sari Store',
    location: 'Manila, Philippines',
    coordinates: { lat: 14.5995, lng: 120.9842 },
    storefrontImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
    contactDetails: {
      phone: '+63 912 345 6789',
      email: 'mangkiko@store.com',
      address: '123 Katipunan St, Quezon City'
    },
    inventory: [
      { id: '1', name: 'Rice', price: 50, description: 'Premium jasmine rice', category: 'Grains', stock: 100 },
      { id: '2', name: 'Canned Sardines', price: 25, description: 'Spanish style sardines', category: 'Canned Goods', stock: 50 },
      { id: '3', name: 'Instant Noodles', price: 15, description: 'Chicken flavor noodles', category: 'Instant Food', stock: 200 }
    ],
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Aling Nena\'s Grocery',
    location: 'Makati, Philippines',
    coordinates: { lat: 14.6091, lng: 120.9799 },
    storefrontImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    contactDetails: {
      phone: '+63 923 456 7890',
      email: 'alingnena@store.com',
      address: '456 Ayala Ave, Makati City'
    },
    inventory: [
      { id: '4', name: 'Bread', price: 35, description: 'Fresh pandesal', category: 'Bakery', stock: 80 },
      { id: '5', name: 'Cooking Oil', price: 120, description: 'Vegetable oil 1L', category: 'Cooking', stock: 30 }
    ],
    createdAt: '2024-02-01'
  }
];
