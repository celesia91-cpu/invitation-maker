// server/designs-store.js
// Simple in-memory storage for user designs.
// In a real application this would interface with a database.

const designsByUser = {
  demo: [
    {
      id: '1',
      title: 'Sample Birthday Invite',
      thumbnailUrl: '/images/birthday-thumb.png',
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString()
    },
    {
      id: '2',
      title: 'Wedding Announcement',
      thumbnailUrl: '/images/wedding-thumb.png',
      updatedAt: new Date('2024-02-15T08:30:00Z').toISOString()
    }
  ]
};

/**
 * Retrieve all designs for the provided user id.
 * @param {string} userId
 * @returns {Promise<Array<{id:string,title:string,thumbnailUrl:string,updatedAt:string}>>}
 */
export async function getDesignsByUser(userId) {
  return designsByUser[userId] ?? [];
}
