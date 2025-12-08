/**
 * API Route Utilities
 *
 * Central export point for all API route helpers.
 * Import from '@/lib/api' instead of individual files.
 *
 * @example
 * import { ok, unauthorized, requireAuth, withAuth, validateBody } from '@/lib/api';
 */

// Response helpers
export {
  ok,
  okMessage,
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  conflict,
  serverError,
} from './helpers';

// Authentication helpers
export {
  requireAuth,
  type AuthResult,
} from './helpers';

// Validation helpers
export {
  validateBody,
  validateQuery,
  parseJsonBody,
  requireAuthAndValidate,
  type ValidationSuccess,
  type ValidationFailure,
  type ValidationResult,
} from './helpers';

// Higher-Order Function wrappers
export {
  withAuth,
  withAuthRaw,
  type AuthenticatedContext,
  type AuthenticatedHandler,
  type RouteHandler,
  type RouteParams,
} from './with-auth';
