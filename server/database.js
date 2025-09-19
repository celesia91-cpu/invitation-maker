// server/database.js
// Simple in-memory data layer modelling application tables.
// In a real application this would connect to a database.

/**
 * Map of category id -> category record
 * Each record: { id:string, name:string }
 */
export const categories = new Map([
  ['birthday', { id: 'birthday', name: 'Birthday' }],
  ['wedding', { id: 'wedding', name: 'Wedding' }],
  ['corporate', { id: 'corporate', name: 'Corporate' }]
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
      createdAt: new Date('2023-12-15T10:00:00Z').toISOString(),
      title: 'Sample Birthday Invite',
      category: 'birthday',
      views: 150,
      thumbnailUrl: '/images/birthday-thumb.png',
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
      status: 'published',
      slides: [],
      tags: ['trending'],
      notes: '',
      price: 0,
      premium: false,
      isAdminTemplate: false,
      adminNotes: '',
      managedByAdminId: null,
      visibility: {
        creator: true,
        consumer: true,
        admin: true
      },
      badges: ['trending']
    }
  ],
  [
    '2',
    {
      id: '2',
      createdAt: new Date('2024-01-20T08:30:00Z').toISOString(),
      title: 'Wedding Announcement',
      category: 'wedding',
      views: 300,
      thumbnailUrl: '/images/wedding-thumb.png',
      updatedAt: new Date('2024-02-15T08:30:00Z').toISOString(),
      status: 'draft',
      slides: [],
      tags: ['creator-beta'],
      notes: '',
      price: 0,
      premium: false,
      isAdminTemplate: false,
      adminNotes: '',
      managedByAdminId: null,
      visibility: {
        creator: true,
        consumer: false,
        admin: true
      },
      badges: ['creator-beta']
    }
  ],
  [
    '3',
    {
      id: '3',
      createdAt: new Date('2024-02-15T09:15:00Z').toISOString(),
      title: 'Premium Event Template',
      category: 'corporate',
      views: 45,
      thumbnailUrl: '/images/corporate-thumb.png',
      updatedAt: new Date('2024-03-10T09:15:00Z').toISOString(),
      status: 'published',
      slides: [],
      tags: ['premium', 'new'],
      notes: 'Reserved for managed accounts',
      price: 24.99,
      premium: true,
      isAdminTemplate: true,
      adminNotes: 'Reserved for managed accounts',
      managedByAdminId: '1',
      visibility: {
        creator: false,
        consumer: true,
        admin: true
      },
      badges: ['premium', 'new']
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
const designThreeUpdatedAt = new Date('2024-03-10T09:15:00Z').toISOString();

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
  ],
  [
    '3',
    {
      designId: '3',
      userId: 'studio-omega',
      createdAt: designThreeUpdatedAt,
      updatedAt: designThreeUpdatedAt
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

/**
 * Map of WebM file id -> metadata record
 * Each record: {
 *   id:string,
 *   designId:string,
 *   storageUri:string,
 *   durationSeconds:number|null,
 *   sizeBytes:number|null,
 *   uploadedBy:string|null,
 *   createdAt:string,
 *   updatedAt:string
 * }
 */
const webmOneTimestamp = new Date('2024-03-20T10:00:00Z').toISOString();
const webmTwoTimestamp = new Date('2024-04-02T15:45:00Z').toISOString();

export const webmFiles = new Map([
  [
    '100',
    {
      id: '100',
      designId: '1',
      storageUri: 'https://cdn.example.com/designs/1/intro.webm',
      durationSeconds: 12.5,
      sizeBytes: 2488320,
      uploadedBy: 'demo',
      createdAt: webmOneTimestamp,
      updatedAt: webmOneTimestamp
    }
  ],
  [
    '101',
    {
      id: '101',
      designId: '2',
      storageUri: 'https://cdn.example.com/designs/2/highlight.webm',
      durationSeconds: 8.75,
      sizeBytes: 1982465,
      uploadedBy: 'demo',
      createdAt: webmTwoTimestamp,
      updatedAt: webmTwoTimestamp
    }
  ]
]);
