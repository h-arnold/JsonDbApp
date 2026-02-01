/**
 * Comprehensive test data for QueryEngine tests
 * Contains documents with various data types, nested objects, arrays and edge cases
 */

const MockQueryData = {
  /**
   * Returns a set of mock users with various data types and structures
   * @returns {Array} Array of test user documents
   */
  getTestUsers() {
    return [
      {
        _id: "user1",
        name: "John Smith",
        email: "john.smith@example.com",
        age: 30,
        active: true,
        registeredOn: new Date("2020-01-15T00:00:00Z"),
        lastLogin: new Date("2023-10-01T14:30:00Z"),
        profile: {
          title: "Software Engineer",
          department: "Engineering",
          yearsOfService: 5,
          skills: ["JavaScript", "Node.js", "Google Apps Script"]
        },
        address: {
          street: "123 Main St",
          city: "London",
          postcode: "W1A 1AA",
          country: "UK"
        },
        orders: [
          { id: "ord-001", amount: 125.50, date: new Date("2023-08-15") },
          { id: "ord-002", amount: 35.99, date: new Date("2023-09-20") }
        ],
        settings: {
          theme: "dark",
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        },
        tags: ["premium", "verified"],
        score: 85.5
      },
      {
        _id: "user2",
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        age: 25,
        active: true,
        registeredOn: new Date("2021-03-20T00:00:00Z"),
        lastLogin: new Date("2023-10-05T09:15:00Z"),
        profile: {
          title: "Product Manager",
          department: "Product",
          yearsOfService: 2,
          skills: ["Product Strategy", "UX", "Agile"]
        },
        address: {
          street: "45 Park Avenue",
          city: "Manchester",
          postcode: "M1 1AA",
          country: "UK"
        },
        orders: [
          { id: "ord-003", amount: 79.99, date: new Date("2023-07-10") }
        ],
        settings: {
          theme: "light",
          notifications: {
            email: true,
            sms: true,
            push: true
          }
        },
        tags: ["premium"],
        score: 92.0
      },
      {
        _id: "user3",
        name: "Mohammed Ali",
        email: "mali@example.com",
        age: 40,
        active: false,
        registeredOn: new Date("2019-05-10T00:00:00Z"),
        lastLogin: new Date("2023-01-15T11:45:00Z"),
        profile: {
          title: "Data Scientist",
          department: "Analytics",
          yearsOfService: 7,
          skills: ["Python", "Machine Learning", "Statistics"]
        },
        address: {
          street: "8 Victoria Road",
          city: "Birmingham",
          postcode: "B1 1AA",
          country: "UK"
        },
        orders: [],
        settings: {
          theme: "system",
          notifications: {
            email: false,
            sms: false,
            push: false
          }
        },
        tags: [],
        score: 78.3
      },
      {
        _id: "user4",
        name: "Emma Wilson",
        email: "emma@example.com",
        age: 32,
        active: true,
        registeredOn: new Date("2020-11-05T00:00:00Z"),
        lastLogin: null,
        profile: {
          title: "Marketing Director",
          department: "Marketing",
          yearsOfService: 4,
          skills: ["Digital Marketing", "SEO", "Content Strategy"]
        },
        address: {
          street: "27 Queen Street",
          city: "Edinburgh",
          postcode: "EH2 1JX",
          country: "UK"
        },
        orders: [
          { id: "ord-004", amount: 145.75, date: new Date("2023-02-28") },
          { id: "ord-005", amount: 27.50, date: new Date("2023-05-17") },
          { id: "ord-006", amount: 89.99, date: new Date("2023-09-30") }
        ],
        settings: {
          theme: "light",
          notifications: {
            email: true,
            sms: false,
            push: false
          }
        },
        tags: ["verified"],
        score: 65.8
      },
      {
        _id: "user5",
        name: "David Chen",
        email: "david.chen@example.com",
        age: 22,
        active: true,
        registeredOn: new Date("2022-07-30T00:00:00Z"),
        lastLogin: new Date("2023-10-06T16:20:00Z"),
        profile: {
          title: "Junior Developer",
          department: "Engineering",
          yearsOfService: 1,
          skills: ["JavaScript", "React", "HTML/CSS"]
        },
        address: null,
        // Intentionally missing orders field for testing
        settings: {
          theme: "dark",
          // Intentionally missing notifications for testing
        },
        tags: ["new"],
        score: 45.0
      }
    ];
  },

  /**
   * Returns a set of mock products with various data types and structures
   * @returns {Array} Array of test product documents
   */
  getTestProducts() {
    return [
      {
        _id: "prod1",
        name: "Laptop Pro",
        category: "Electronics",
        price: 1299.99,
        inStock: true,
        releaseDate: new Date("2022-06-15"),
        specs: {
          processor: "Intel i7",
          memory: "16GB",
          storage: "512GB SSD",
          display: {
            size: 15.6,
            resolution: "4K",
            touchscreen: true
          }
        },
        colours: ["Silver", "Space Grey", "Black"],
        ratings: [4, 5, 4.5, 5, 4],
        tags: ["featured", "bestseller", "new-arrival"]
      },
      {
        _id: "prod2",
        name: "Smartphone X",
        category: "Electronics",
        price: 899.99,
        inStock: true,
        releaseDate: new Date("2023-01-10"),
        specs: {
          processor: "A15",
          memory: "8GB",
          storage: "256GB",
          display: {
            size: 6.1,
            resolution: "Full HD+",
            touchscreen: true
          }
        },
        colours: ["Black", "White", "Blue", "Red"],
        ratings: [3.5, 4, 5, 4.5],
        tags: ["featured", "new-arrival"]
      },
      {
        _id: "prod3",
        name: "Coffee Maker Deluxe",
        category: "Kitchen Appliances",
        price: 129.50,
        inStock: false,
        releaseDate: new Date("2021-11-20"),
        specs: {
          capacity: "1.5L",
          programmable: true,
          wattage: "1000W"
        },
        colours: ["Black", "White", "Red"],
        ratings: [4, 3.5, 4, 4.5, 5, 3],
        tags: ["bestseller"]
      },
      {
        _id: "prod4",
        name: "Wireless Headphones",
        category: "Audio",
        price: 249.99,
        inStock: true,
        releaseDate: new Date("2022-09-05"),
        specs: {
          type: "Over-ear",
          batteryLife: "30 hours",
          noiseCancel: true,
          connectivity: {
            bluetooth: "5.0",
            wired: true,
            nfc: true
          }
        },
        colours: ["Black"],
        ratings: [5, 5, 4.5, 5],
        tags: ["featured", "premium"]
      },
      {
        _id: "prod5",
        name: "Fitness Tracker",
        category: "Wearables",
        price: 89.99,
        inStock: true,
        releaseDate: new Date("2023-03-15"),
        specs: {
          waterproof: true,
          batteryLife: "7 days",
          sensors: ["heart rate", "accelerometer", "GPS"],
          display: {
            size: 1.2,
            touchscreen: true
          }
        },
        colours: ["Black", "Blue", "Pink"],
        ratings: [4, 3, 4.5, 4],
        tags: ["new-arrival"]
      },
      {
        _id: "prod6",
        name: "Designer Watch",
        category: "Accessories",
        price: 299.95,
        inStock: true,
        releaseDate: new Date("2021-05-20"),
        specs: {
          watchType: "Analogue",
          waterResistant: true,
          material: "Stainless Steel"
        },
        colours: ["Silver", "Gold", "Rose Gold"],
        ratings: [5, 4.5, 5, 5],
        tags: ["premium", "luxury"]
      }
    ];
  },

  /**
   * Returns a set of mixed test documents with edge cases
   * @returns {Array} Array of test documents with edge cases
   */
  getEdgeCaseDocuments() {
    return [
      {
        _id: "edge1",
        emptyArray: [],
        nullValue: null,
        undefinedValue: undefined,
        emptyObject: {},
        zeroValue: 0,
        falseValue: false,
        emptyString: "",
        nestedEmpty: {
          empty: {},
          null: null
        }
      },
      {
        _id: "edge2",
        deeplyNested: {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: "deeply nested value"
                }
              }
            }
          }
        },
        arrayOfObjects: [
          { id: 1, value: "first" },
          { id: 2, value: "second" },
          { id: 3, value: "third" }
        ],
        mixedArray: [1, "string", true, { key: "value" }, null],
        specialChars: "!@#$%^&*()"
      },
      {
        _id: "edge3",
        sameValueDifferentTypes: [
          123,
          "123",
          true,
          new Date(123)
        ],
        duplicateValues: [5, 5, 5, 5],
        extremeNumbers: {
          veryLarge: 1e20,
          verySmall: 1e-20,
          negative: -9999
        }
      }
    ];
  },

  /**
   * Provides all test documents combined in a single array
   * @returns {Array} Combined array of all test documents
   */
  getAllTestDocuments() {
    return [
      ...this.getTestUsers(),
      ...this.getTestProducts(),
      ...this.getEdgeCaseDocuments()
    ];
  },

  /**
   * Generates a large dataset for performance testing
   * @param {number} count - Number of documents to generate
   * @returns {Array} Array of test documents
   */
  getLargeDataset(count = 100) {
    const documents = [];
    const categories = ['test', 'performance', 'bulk', 'demo'];
    const statuses = ['active', 'inactive', 'pending'];
    
    for (let i = 0; i < count; i++) {
      documents.push({
        _id: `large_doc_${i}`,
        name: `Document ${i}`,
        category: categories[i % categories.length],
        status: statuses[i % statuses.length],
        index: i,
        value: Math.floor(Math.random() * 1000),
        timestamp: new Date(),
        metadata: {
          generated: true,
          batch: Math.floor(i / 10),
          priority: i % 5
        }
      });
    }
    
    return documents;
  }
};
export default MockQueryData;
