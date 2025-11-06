// Jest setup file
// Set environment variables for testing
process.env.UNIPILE_MOCK_MODE = 'true';
process.env.REDIS_URL = 'redis://localhost:6379';

// Import @testing-library/jest-dom for extended matchers
require('@testing-library/jest-dom');
