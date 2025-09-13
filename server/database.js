// server/database.js
// Simple in-memory data layer for tokens and purchases.
// In a real application this would connect to a database.

// Map of user id -> token balance
export const userTokens = new Map();

// Map of user id -> array of purchase records
// Each record: { amount:number, purchasedAt:string }
export const userPurchases = new Map();
