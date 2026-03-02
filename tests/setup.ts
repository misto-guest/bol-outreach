/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console.log for cleaner test output (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Puppeteer for unit tests (can be overridden in integration tests)
jest.mock('puppeteer-core', () => ({
  connect: jest.fn(),
  launch: jest.fn(),
}));

// Mock AdsPowerClient for unit tests
jest.mock('../src/adspower-client', () => ({
  default: jest.fn().mockImplementation(() => ({
    startProfile: jest.fn(),
    getProfiles: jest.fn(),
    stopProfile: jest.fn(),
  })),
}));

// Mock Database for unit tests
jest.mock('../src/database', () => ({
  default: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn(),
    checkAdsPowerUsage: jest.fn(),
    recordMessageSent: jest.fn(),
    logAudit: jest.fn(),
    getDashboardStats: jest.fn(),
  })),
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
