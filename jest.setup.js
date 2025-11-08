// Jest setup file
// Set environment variables for testing
process.env.UNIPILE_MOCK_MODE = 'true';
process.env.REDIS_URL = 'redis://localhost:6379';

// Import @testing-library/jest-dom for extended matchers
require('@testing-library/jest-dom');

// Polyfill Next.js server environment for API route tests
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this._bodyInit = init.body;
    }

    async json() {
      if (typeof this._bodyInit === 'string') {
        return JSON.parse(this._bodyInit);
      }
      return this._bodyInit || {};
    }

    async text() {
      return this._bodyInit || '';
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    async text() {
      return this.body;
    }
  };
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers extends Map {
    constructor(init) {
      super(init ? Object.entries(init) : []);
    }

    get(name) {
      return super.get(name.toLowerCase());
    }

    set(name, value) {
      return super.set(name.toLowerCase(), value);
    }
  };
}

// Mock crypto for Node.js < 19
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const { randomBytes } = require('crypto');
  global.crypto = {
    randomUUID: () => {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ randomBytes(1)[0] & 15 >> c / 4).toString(16)
      );
    },
  };
}
