/**
 * Integrations Module
 *
 * ============================================================
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 * Chi-gateway is for personal PAI infrastructure only.
 * ============================================================
 *
 * Diiiploy-gateway is the single source of truth for integration tokens.
 * This module provides read-only status access - no token storage in the app.
 */

export {
  fetchDiiiplopyGatewayHealth,
  getIntegrationStatuses,
  getServiceStatus,
  getGatewaySummary,
  isGatewayReachable,
  type DiiiplopyGatewayService,
  type DiiiplopyGatewayHealthResponse,
  type IntegrationStatus,
} from './diiiploy-gateway-status'
