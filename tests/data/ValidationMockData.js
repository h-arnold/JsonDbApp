/**
 * ValidationMockData.js - Generates dataset for validation tests including nested structures
 * 
 * This module provides mock data for testing query and update operators.
 * It's a port of the old_tests/data/ValidationMockData.js for the new Vitest framework.
 */

export const ValidationMockData = {
  /**
   * Returns a set of nested person documents against which validation operators can be tested
   * Enhanced for comprehensive query and update operator testing
   * @returns {Array<Object>} Array of person documents
   */
  getPersons() {
    return [
      {
        _id: 'person1',
        name: { first: 'Anna', last: 'Brown' },
        contact: { email: 'anna.brown@example.com', phones: ['123-456-7890'] },
        age: 29,
        score: 85.5,
        balance: 1250.75,
        isActive: true,
        lastLogin: new Date('2025-06-20T10:30:00Z'),
        preferences: { 
          newsletter: true, 
          tags: ['sports', 'music'],
          settings: {
            theme: 'dark',
            notifications: {
              email: { enabled: true, frequency: 'weekly' },
              sms: { enabled: false }
            }
          }
        },
        metadata: { version: 1, temporary: true }
      },
      {
        _id: 'person2',
        name: { first: 'Ben', last: 'Green' },
        contact: { email: 'ben.green@example.com', phones: [] },
        age: 0,
        score: 0,
        balance: 0,
        isActive: false,
        lastLogin: null,
        preferences: { 
          newsletter: false, 
          tags: [],
          settings: {
            theme: 'light',
            notifications: {
              email: { enabled: false },
              sms: { enabled: false }
            }
          }
        },
        metadata: { version: 1 }
      },
      {
        _id: 'person3',
        name: { first: 'Clara', last: 'Smith' },
        contact: { email: null, phones: ['111-222-3333', '444-555-6666'] },
        age: 45,
        score: 92.3,
        balance: -150.25,
        isActive: true,
        lastLogin: new Date('2025-06-15T14:22:00Z'),
        preferences: { 
          newsletter: true, 
          tags: ['news', 'alerts', 'sports'],
          settings: {
            theme: 'auto',
            notifications: {
              email: { enabled: true, frequency: 'daily' },
              sms: { enabled: true, frequency: 'weekly' }
            }
          }
        },
        metadata: { version: 2, temporary: false, archived: true }
      },
      {
        _id: 'person4',
        name: { first: 'Diana', last: 'Prince' },
        contact: { email: 'diana.prince@example.com', phones: ['777-888-9999', '000-111-2222'] },
        age: 38,
        score: 78.1,
        balance: 3500.00,
        isActive: true,
        lastLogin: new Date('2025-06-25T09:15:00Z'),
        preferences: {
          newsletter: true,
          tags: ['travel', 'photography', 'music'],
          settings: {
            theme: 'dark',
            notifications: {
              email: { enabled: true, frequency: 'weekly' },
              sms: { enabled: false }
            }
          }
        },
        metadata: { version: 3, temporary: true }
      },
      {
        _id: 'person5',
        name: { first: 'Ethan', last: 'Hunt' },
        contact: { email: 'ethan.hunt@example.com', phones: ['333-444-5555'] },
        age: 50,
        score: 95.8,
        balance: 750.50,
        isActive: false,
        lastLogin: new Date('2025-06-01T16:45:00Z'),
        preferences: {
          newsletter: false,
          tags: ['action', 'adventure', 'travel'],
          settings: {
            theme: 'light',
            notifications: {
              email: { enabled: false },
              sms: { enabled: true, frequency: 'daily' }
            }
          }
        },
        metadata: { version: 1, archived: false }
      },
      {
        _id: 'person6',
        name: { first: 'Frank', last: 'Miller' },
        contact: { email: '', phones: ['999-888-7777', '111-222-3333', '444-555-6666'] },
        age: 65,
        score: 45.2,
        balance: 10000.99,
        isActive: true,
        lastLogin: new Date('2025-06-24T20:00:00Z'),
        preferences: {
          newsletter: true,
          tags: ['news', 'politics', 'sports', 'technology'],
          settings: {
            theme: 'high-contrast',
            notifications: {
              email: { enabled: true, frequency: 'immediate' },
              sms: { enabled: true, frequency: 'immediate' }
            }
          }
        },
        metadata: { version: 5, temporary: false, priority: 'high' }
      }
    ];
  }
};
