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
        balance: 3500.0,
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
        balance: 750.5,
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
  },

  /**
   * Returns a set of order documents for testing type changes and field updates
   * @returns {Array<Object>} Array of order documents
   */
  getOrders() {
    return [
      {
        _id: 'order1',
        userId: 'person1',
        orderNumber: 1001,
        items: [
          { sku: 'prod1', quantity: 2, price: 9.99, category: 'electronics' },
          { sku: 'prod2', quantity: 1, price: 19.99, category: 'books' }
        ],
        status: 'processing',
        priority: 1,
        totalAmount: 39.97,
        discountPercent: 0,
        createdAt: new Date('2025-06-01T10:00:00Z'),
        updatedAt: new Date('2025-06-01T10:00:00Z'),
        isRush: false,
        tags: ['online', 'new-customer'],
        customerNotes: 'Please deliver after 6 PM',
        metrics: {
          processTime: 24,
          satisfaction: 4.5,
          delivery: {
            estimatedDays: 3,
            actualDays: null
          }
        }
      },
      {
        _id: 'order2',
        userId: 'person2',
        orderNumber: 1002,
        items: [],
        status: 'cancelled',
        priority: 3,
        totalAmount: 0,
        discountPercent: 100,
        createdAt: new Date('2025-06-15T12:30:00Z'),
        updatedAt: new Date('2025-06-15T13:00:00Z'),
        isRush: false,
        tags: [],
        customerNotes: '',
        metrics: {
          processTime: 0,
          satisfaction: 1.0,
          delivery: {
            estimatedDays: 0,
            actualDays: 0
          }
        }
      },
      {
        _id: 'order3',
        userId: 'person3',
        orderNumber: 1003,
        items: [
          { sku: 'prod1', quantity: 5, price: 9.99, category: 'electronics' },
          { sku: 'prod3', quantity: 2, price: 29.99, category: 'home' },
          { sku: 'prod1', quantity: 1, price: 9.99, category: 'electronics' }
        ],
        status: 'shipped',
        priority: 2,
        totalAmount: 119.93,
        discountPercent: 10,
        createdAt: new Date('2025-06-20T16:45:00Z'),
        updatedAt: new Date('2025-06-22T09:30:00Z'),
        isRush: true,
        tags: ['bulk', 'repeat-customer', 'expedited'],
        customerNotes: 'Fragile items - handle with care',
        shipping: {
          address: { street: '1000 Hero Ln', city: 'Metropolis', zip: '12345' },
          carrier: { name: 'FastShip', tracking: 'TRACK123' },
          cost: 15.99
        },
        metrics: {
          processTime: 48,
          satisfaction: 5.0,
          delivery: {
            estimatedDays: 2,
            actualDays: 2
          }
        }
      },
      {
        _id: 'order4',
        userId: 'person4',
        orderNumber: 1004,
        items: [{ sku: 'prod4', quantity: 10, price: 5.5, category: 'office' }],
        status: 'returned',
        priority: 1,
        totalAmount: 55.0,
        discountPercent: 0,
        createdAt: new Date('2025-06-22T09:00:00Z'),
        updatedAt: new Date('2025-06-25T14:20:00Z'),
        isRush: false,
        tags: ['return', 'defective'],
        customerNotes: null,
        shipping: {
          address: null,
          carrier: { name: 'StandardPost', tracking: null },
          cost: 0
        },
        metrics: {
          processTime: 72,
          satisfaction: 2.0,
          delivery: {
            estimatedDays: 5,
            actualDays: 3
          }
        }
      },
      {
        _id: 'order5',
        userId: 'person5',
        orderNumber: 1005,
        items: [
          { sku: 'prod5', quantity: 1, price: 199.99, category: 'electronics' },
          { sku: 'prod6', quantity: 3, price: 45.0, category: 'accessories' }
        ],
        status: 'delivered',
        priority: 1,
        totalAmount: 334.99,
        discountPercent: 5,
        createdAt: new Date('2025-05-30T08:15:00Z'),
        updatedAt: new Date('2025-06-05T16:30:00Z'),
        isRush: true,
        tags: ['premium', 'express', 'gift'],
        customerNotes: 'Gift wrap requested',
        shipping: {
          address: { street: '500 Mission St', city: 'San Francisco', zip: '94105' },
          carrier: { name: 'ExpressDelivery', tracking: 'EXPRESS789' },
          cost: 25.99
        },
        metrics: {
          processTime: 12,
          satisfaction: 4.8,
          delivery: {
            estimatedDays: 1,
            actualDays: 1
          }
        }
      }
    ];
  },

  /**
   * Returns a set of nested inventory documents for testing numeric and array updates
   * Enhanced with comprehensive numeric fields and array scenarios
   * @returns {Array<Object>} Array of inventory documents
   */
  getInventory() {
    return [
      {
        _id: 'inv1',
        warehouse: { location: 'East', capacity: 1000, zone: 'A' },
        stock: { prod1: 100, prod2: 50, prod3: 0 },
        counts: {
          total: 150,
          reserved: 25,
          available: 125,
          incoming: 200
        },
        multiplier: 1.0,
        temperature: 22.5,
        humidity: 45,
        isClimateControlled: true,
        lastInventoryDate: new Date('2025-06-20T00:00:00Z'),
        tags: ['cold', 'fragile'],
        categories: ['electronics', 'books'],
        managers: ['john.doe', 'jane.smith'],
        alerts: [
          { type: 'low-stock', product: 'prod3', threshold: 10 },
          { type: 'maintenance', area: 'zone-A', date: new Date('2025-07-01T00:00:00Z') }
        ],
        settings: {
          autoReorder: {
            enabled: true,
            threshold: 20,
            quantity: 100
          },
          security: {
            level: 'high',
            cameras: ['cam1', 'cam2'],
            access: {
              keycard: true,
              biometric: false
            }
          }
        }
      },
      {
        _id: 'inv2',
        warehouse: { location: 'West', capacity: 500, zone: 'B' },
        stock: { prod1: 0, prod2: 0, prod4: 25 },
        counts: {
          total: 25,
          reserved: 0,
          available: 25,
          incoming: 0
        },
        multiplier: 0.5,
        temperature: 18.0,
        humidity: 60,
        isClimateControlled: false,
        lastInventoryDate: new Date('2025-06-15T00:00:00Z'),
        tags: [],
        categories: ['office'],
        managers: [],
        alerts: [],
        settings: {
          autoReorder: {
            enabled: false,
            threshold: 5,
            quantity: 50
          },
          security: {
            level: 'medium',
            cameras: ['cam3'],
            access: {
              keycard: true,
              biometric: false
            }
          }
        }
      },
      {
        _id: 'inv3',
        warehouse: {
          location: 'North',
          capacity: 2000,
          zone: 'C',
          manager: {
            name: 'John Doe',
            contact: {
              email: 'j.doe@warehouse.com',
              phone: '999-999-9999'
            },
            shifts: ['morning', 'evening']
          }
        },
        stock: { prod1: 500, prod2: 300, prod3: 0, prod5: 150 },
        counts: {
          total: 950,
          reserved: 100,
          available: 850,
          incoming: 500
        },
        multiplier: 2.0,
        temperature: 20.5,
        humidity: 50,
        isClimateControlled: true,
        lastInventoryDate: new Date('2025-06-25T00:00:00Z'),
        tags: ['oversupply', 'high-capacity'],
        categories: ['electronics', 'home', 'accessories'],
        managers: ['john.doe', 'alice.johnson', 'bob.wilson'],
        alerts: [
          { type: 'oversupply', product: 'prod1', threshold: 400 },
          { type: 'capacity', percentage: 85, action: 'redistribute' }
        ],
        receipts: [
          { date: new Date('2025-06-01T00:00:00Z'), quantity: 200, supplier: 'SupplierA' },
          { date: new Date('2025-06-10T00:00:00Z'), quantity: 300, supplier: 'SupplierB' },
          { date: new Date('2025-06-20T00:00:00Z'), quantity: 150, supplier: 'SupplierA' }
        ],
        settings: {
          autoReorder: {
            enabled: true,
            threshold: 50,
            quantity: 200
          },
          security: {
            level: 'maximum',
            cameras: ['cam4', 'cam5', 'cam6', 'cam7'],
            access: {
              keycard: true,
              biometric: true
            }
          }
        }
      },
      {
        _id: 'inv4',
        warehouse: { location: 'South', capacity: 750, zone: 'D' },
        stock: { prod6: 75, prod7: 125 },
        counts: {
          total: 200,
          reserved: 50,
          available: 150,
          incoming: 100
        },
        multiplier: 1.5,
        temperature: 25.0,
        humidity: 40,
        isClimateControlled: true,
        lastInventoryDate: new Date('2025-06-18T00:00:00Z'),
        tags: ['new-facility', 'premium'],
        categories: ['premium', 'luxury'],
        managers: ['sarah.connor'],
        alerts: [{ type: 'new-stock', product: 'prod7', date: new Date('2025-06-18T00:00:00Z') }],
        receipts: [
          { date: new Date('2025-06-18T00:00:00Z'), quantity: 200, supplier: 'PremiumSupplier' }
        ],
        settings: {
          autoReorder: {
            enabled: true,
            threshold: 30,
            quantity: 100
          },
          security: {
            level: 'high',
            cameras: ['cam8', 'cam9'],
            access: {
              keycard: true,
              biometric: true
            }
          }
        }
      }
    ];
  }
};
