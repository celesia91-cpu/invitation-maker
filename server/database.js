// server/database.js
// Simple in-memory data layer modelling application tables.
// In a real application this would connect to a database.

/**
 * Map of category id -> category record
 * Each record: { id:string, name:string }
 */
export const categories = new Map([
  ['birthday', { id: 'birthday', name: 'Birthday' }],
  ['wedding', { id: 'wedding', name: 'Wedding' }]
]);

/**
 * Map of design id -> design record
 * Each record: {
 *   id:string,
 *   title:string,
 *   category:string,
 *   views:number,
 *   thumbnailUrl:string,
 *   updatedAt:string,
 *   price?:number,
 *   premium?:boolean,
 *   isAdminTemplate?:boolean,
 *   adminNotes?:string,
 *   managedByAdminId?:string|null
 * }
 */
export const designs = new Map([
  [
    '1',
    {
      id: '1',
      title: 'Sample Birthday Invite',
      category: 'birthday',
      views: 150,
      thumbnailUrl: '/images/birthday-thumb.png',
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
      price: 0,
      premium: false,
      isAdminTemplate: false,
      adminNotes: '',
      managedByAdminId: null
    }
  ],
  [
    '2',
    {
      id: '2',
      title: 'Wedding Announcement',
      category: 'wedding',
      views: 300,
      thumbnailUrl: '/images/wedding-thumb.png',
      updatedAt: new Date('2024-02-15T08:30:00Z').toISOString(),
      price: 0,
      premium: false,
      isAdminTemplate: false,
      adminNotes: '',
      managedByAdminId: null
    }
  ]
]);

/**
 * Map of design id -> ownership record
 * Each record: {
 *   designId:string,
 *   userId:string,
 *   createdAt:string,
 *   updatedAt:string
 * }
 */
const designOneUpdatedAt = new Date('2024-01-01T12:00:00Z').toISOString();
const designTwoUpdatedAt = new Date('2024-02-15T08:30:00Z').toISOString();

export const designOwners = new Map([
  [
    '1',
    {
      designId: '1',
      userId: 'demo',
      createdAt: designOneUpdatedAt,
      updatedAt: designOneUpdatedAt
    }
  ],
  [
    '2',
    {
      designId: '2',
      userId: 'demo',
      createdAt: designTwoUpdatedAt,
      updatedAt: designTwoUpdatedAt
    }
  ]
]);

/**
 * Map of user id -> token balance
 */
export const userTokens = new Map();

/**
 * Map of user id -> array of purchase records
 * Each record: { amount:number, purchasedAt:string }
 */
export const userPurchases = new Map();
