import fs from 'fs';
import path from 'path';
import { projectManager } from '../projects/projectManager.js';
import { dbEngine } from '../db/engine.js';
import { storageEngine } from '../storage/storageEngine.js';
import { authEngine } from '../auth/authEngine.js';
import { rulesEngine } from '../security/rulesEngine.js';
import { metricsEngine } from '../analytics/metricsEngine.js';

export function initializeSeedData() {
  const projects = projectManager.listProjects();
  if (projects.length > 0) {
    return; // Already initialized
  }

  console.log('⚡ Initializing Stratum Cloud demo projects and seed data...');

  // 1. Apex Commerce Platform
  const apexProject = projectManager.createProject({
    name: 'Apex Commerce Cloud',
    description: 'High-performance e-commerce backend powering global storefronts and mobile apps.',
    plan: 'pro',
    ownerEmail: 'admin@stratum.dev'
  });

  // Seed DB Collections for Apex
  dbEngine.createCollection(apexProject.id, 'products');
  dbEngine.createCollection(apexProject.id, 'orders');
  dbEngine.createCollection(apexProject.id, 'categories');
  dbEngine.createCollection(apexProject.id, 'customers');

  const products = [
    {
      title: 'Aura Studio Wireless Headphones',
      sku: 'AUR-WL-01',
      category: 'Audio',
      price: 299.99,
      inventory: 142,
      inStock: true,
      rating: 4.8,
      tags: ['audio', 'wireless', 'anc', 'bluetooth5.3'],
      specs: { batteryHours: 40, weightGrams: 250, driverMm: 40 },
      metadata: { featured: true, season: '2026' }
    },
    {
      title: 'Titanium Mechanical Keyboard (Custom Lubed)',
      sku: 'TIT-KB-87',
      category: 'Peripherals',
      price: 189.50,
      inventory: 64,
      inStock: true,
      rating: 4.9,
      tags: ['mechanical', 'rgb', 'gasket-mount', 'hot-swap'],
      specs: { switches: 'Gateron Oil King', layout: 'TKL 87-key', pollingRateHz: 1000 },
      metadata: { featured: true, warrantyYears: 2 }
    },
    {
      title: 'UltraWide Curved OLED Monitor 34"',
      sku: 'MON-OLED-34',
      category: 'Displays',
      price: 849.00,
      inventory: 18,
      inStock: true,
      rating: 4.7,
      tags: ['oled', 'gaming', 'ultrawide', '175hz'],
      specs: { resolution: '3440x1440', refreshRateHz: 175, hdr: 'TrueBlack 400' },
      metadata: { featured: false }
    },
    {
      title: 'HyperDrive Precision Wireless Gaming Mouse',
      sku: 'HYP-MOU-09',
      category: 'Peripherals',
      price: 79.99,
      inventory: 310,
      inStock: true,
      rating: 4.6,
      tags: ['gaming', 'wireless', 'sensor-paw3395'],
      specs: { dpi: 26000, weightGrams: 52, buttons: 6 },
      metadata: { featured: true }
    },
    {
      title: 'ErgoMaster Pro High-Density Mesh Chair',
      sku: 'FUR-CHR-05',
      category: 'Furniture',
      price: 499.00,
      inventory: 22,
      inStock: true,
      rating: 4.9,
      tags: ['ergonomic', 'mesh', 'lumbar-support'],
      specs: { maxWeightKg: 150, reclineAngleDeg: 135 },
      metadata: { assemblyRequired: true }
    }
  ];

  for (const prod of products) {
    dbEngine.createDocument(apexProject.id, 'products', prod);
  }

  // Seed Categories
  const categories = [
    { name: 'Audio', slug: 'audio', productCount: 14, icon: 'headphones', active: true },
    { name: 'Peripherals', slug: 'peripherals', productCount: 38, icon: 'keyboard', active: true },
    { name: 'Displays', slug: 'displays', productCount: 9, icon: 'monitor', active: true },
    { name: 'Furniture', slug: 'furniture', productCount: 12, icon: 'armchair', active: true }
  ];
  for (const cat of categories) {
    dbEngine.createDocument(apexProject.id, 'categories', cat);
  }

  // Seed Orders
  const orders = [
    {
      orderNumber: 'ORD-2026-9041',
      customerEmail: 'alex.chen@cybertech.io',
      totalAmount: 489.49,
      currency: 'USD',
      status: 'DELIVERED',
      itemsCount: 2,
      shippingAddress: { city: 'San Francisco', state: 'CA', country: 'US', zip: '94107' },
      paymentMethod: 'CreditCard (Visa)',
      paid: true
    },
    {
      orderNumber: 'ORD-2026-9042',
      customerEmail: 'sophia.vogel@berlin-design.de',
      totalAmount: 849.00,
      currency: 'USD',
      status: 'PROCESSING',
      itemsCount: 1,
      shippingAddress: { city: 'Berlin', state: 'BE', country: 'DE', zip: '10115' },
      paymentMethod: 'PayPal',
      paid: true
    },
    {
      orderNumber: 'ORD-2026-9043',
      customerEmail: 'marcus.brooks@london-venture.uk',
      totalAmount: 299.99,
      currency: 'USD',
      status: 'SHIPPED',
      itemsCount: 1,
      shippingAddress: { city: 'London', state: 'LDN', country: 'UK', zip: 'EC2A 4NE' },
      paymentMethod: 'ApplePay',
      paid: true
    }
  ];
  for (const ord of orders) {
    dbEngine.createDocument(apexProject.id, 'orders', ord);
  }

  // Seed End-Users for Apex
  authEngine.registerProjectUser(apexProject.id, {
    email: 'alex.chen@cybertech.io',
    password: 'Password123!',
    displayName: 'Alex Chen',
    customClaims: { role: 'customer', vipTier: 'gold', loyaltyPoints: 2400 }
  });

  authEngine.registerProjectUser(apexProject.id, {
    email: 'sophia.vogel@berlin-design.de',
    password: 'Password123!',
    displayName: 'Sophia Vogel',
    customClaims: { role: 'customer', vipTier: 'platinum', loyaltyPoints: 8900 }
  });

  authEngine.registerProjectUser(apexProject.id, {
    email: 'store.manager@apexcommerce.io',
    password: 'AdminPassword2026!',
    displayName: 'Sarah Jenkins (Store Mgr)',
    customClaims: { role: 'admin', canRefund: true, accessBackoffice: true }
  });

  // Seed Storage files for Apex
  const dummyFileDir = storageEngine.getFilesDir(apexProject.id);
  const sampleCatalogPath = path.join(dummyFileDir, 'q1-product-catalog.pdf');
  fs.writeFileSync(sampleCatalogPath, '%PDF-1.4 ... Sample Apex Product Catalog Document Content ...');
  storageEngine.saveUploadedFile(apexProject.id, {
    originalname: 'q1-product-catalog.pdf',
    filename: 'q1-product-catalog.pdf',
    mimetype: 'application/pdf',
    size: 245890
  }, { folder: '/catalogs', isPublic: true });

  const sampleBannerPath = path.join(dummyFileDir, 'hero-banner-spring.png');
  fs.writeFileSync(sampleBannerPath, 'RIFF-WEBP-SAMPLE-IMAGE-CONTENT');
  storageEngine.saveUploadedFile(apexProject.id, {
    originalname: 'hero-banner-spring.png',
    filename: 'hero-banner-spring.png',
    mimetype: 'image/png',
    size: 1420800
  }, { folder: '/marketing', isPublic: true });

  storageEngine.createFolder(apexProject.id, '/products');
  storageEngine.createFolder(apexProject.id, '/invoices');

  // Seed Custom Security Rules for Apex
  rulesEngine.saveRules(apexProject.id, {
    version: '2',
    rules: {
      database: {
        products: {
          read: 'true',
          create: "auth != null && auth.role == 'admin'",
          update: "auth != null && auth.role == 'admin'",
          delete: "auth != null && auth.role == 'admin'"
        },
        orders: {
          read: "auth != null && (auth.role == 'admin' || auth.email == resource.customerEmail)",
          create: "auth != null",
          update: "auth != null && auth.role == 'admin'",
          delete: "auth != null && auth.role == 'admin'"
        },
        categories: {
          read: 'true',
          write: "auth != null && auth.role == 'admin'"
        }
      },
      storage: {
        "marketing/*": {
          read: "true",
          write: "auth != null && auth.role == 'admin'"
        },
        "catalogs/*": {
          read: "true",
          write: "auth != null"
        },
        "invoices/*": {
          read: "auth != null",
          write: "auth != null && auth.role == 'admin'"
        }
      }
    }
  });

  // Seed some realistic API request logs
  const sampleEndpoints = [
    { method: 'GET', path: `/api/v1/projects/${apexProject.id}/db/products`, status: 200, dur: 12, service: 'database' },
    { method: 'GET', path: `/api/v1/projects/${apexProject.id}/db/products?limit=10`, status: 200, dur: 18, service: 'database' },
    { method: 'POST', path: `/api/v1/projects/${apexProject.id}/auth/signin`, status: 200, dur: 45, service: 'auth' },
    { method: 'GET', path: `/api/v1/projects/${apexProject.id}/db/orders`, status: 200, dur: 22, service: 'database' },
    { method: 'GET', path: `/api/v1/projects/${apexProject.id}/storage/files?folder=/catalogs`, status: 200, dur: 8, service: 'storage' },
    { method: 'POST', path: `/api/v1/projects/${apexProject.id}/db/orders`, status: 201, dur: 32, service: 'database' }
  ];

  for (const ep of sampleEndpoints) {
    metricsEngine.recordRequest(apexProject.id, {
      method: ep.method,
      path: ep.path,
      statusCode: ep.status,
      durationMs: ep.dur,
      service: ep.service,
      ip: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    });
  }

  // 2. Pulse Social Platform (Second Project)
  const pulseProject = projectManager.createProject({
    name: 'Pulse Social App',
    description: 'Community messaging, feed engine and real-time social engagement microservices.',
    plan: 'free',
    ownerEmail: 'admin@stratum.dev'
  });

  dbEngine.createCollection(pulseProject.id, 'posts');
  dbEngine.createCollection(pulseProject.id, 'channels');

  dbEngine.createDocument(pulseProject.id, 'posts', {
    author: 'elena.rostova',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
    content: 'Just deployed our newest real-time streaming pipeline using Stratum BaaS! Latency dropped under 25ms worldwide 🚀🔥',
    likesCount: 342,
    sharesCount: 56,
    tags: ['webdev', 'cloud', 'realtime'],
    published: true
  });

  dbEngine.createDocument(pulseProject.id, 'posts', {
    author: 'david.k',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
    content: 'The tree database explorer and instant security rules debugger are total game changers.',
    likesCount: 189,
    sharesCount: 14,
    tags: ['developer-experience', 'dx'],
    published: true
  });

  authEngine.registerProjectUser(pulseProject.id, {
    email: 'elena@pulsecommunity.io',
    password: 'Password123!',
    displayName: 'Elena Rostova',
    customClaims: { role: 'creator', badges: ['early_adopter', 'top_contributor'] }
  });

  console.log('✅ Seed data initialized successfully.');
}

