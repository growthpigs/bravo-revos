/**
 * SmartRouter - AI-powered intent classification using Gemini Flash
 *
 * Classifies user queries into 5 route types:
 * - rag: Document/knowledge base queries
 * - web: Current events, real-time information
 * - memory: Previous conversation recall
 * - casual: Greetings, simple questions
 * - dashboard: Navigation commands
 */

import { GoogleGenAI } from '@google/genai';
import type { RouteType, QueryRoute, RouterContext, SessionContext } from './types';

const ROUTER_MODEL = 'gemini-3-flash-preview';

const CLASSIFICATION_PROMPT = `You are a query intent classifier. Classify the user's query into exactly ONE category.

Categories:
- rag: Questions about documents, policies, SOPs, internal knowledge base
- web: Current events, news, real-time data, recent happenings, anything needing live search
- memory: Questions about previous conversations ("do you remember", "last time", "we discussed")
- casual: Greetings, simple questions, chitchat, opinions
- dashboard: App data queries AND navigation - clients, alerts, stats, performance, integrations ("show me clients", "what alerts", "agency stats", "at-risk", "go to dashboard")

Respond with ONLY a JSON object in this exact format:
{"route": "category_name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Examples:
User: "What's the latest news on AI?"
{"route": "web", "confidence": 0.95, "reasoning": "Asking for current/latest information requires web search"}

User: "What's our refund policy?"
{"route": "rag", "confidence": 0.9, "reasoning": "Asking about internal policy, likely in knowledge base"}

User: "Do you remember what we discussed about the campaign?"
{"route": "memory", "confidence": 0.95, "reasoning": "Explicit memory recall request"}

User: "Hello, how are you?"
{"route": "casual", "confidence": 0.98, "reasoning": "Simple greeting"}

User: "Take me to the analytics dashboard"
{"route": "dashboard", "confidence": 0.92, "reasoning": "Navigation command"}

User: "What critical alerts do I have?"
{"route": "dashboard", "confidence": 0.9, "reasoning": "Asking about alerts data from the app"}

User: "Show me at-risk clients"
{"route": "dashboard", "confidence": 0.92, "reasoning": "Requesting client data filtered by risk status"}

User: "Give me agency statistics for this week"
{"route": "dashboard", "confidence": 0.88, "reasoning": "Requesting stats data from the platform"}

Now classify this query:
User: "{query}"`;

// Estimated latency per route (ms)
const ROUTE_LATENCY: Record<RouteType, number> = {
  casual: 1000,
  memory: 1500,
  dashboard: 500,
  rag: 3000,
  web: 4000,
};

export class SmartRouter {
  private genai: GoogleGenAI;
  private fallbackRoute: RouteType = 'casual';
  private confidenceThreshold = 0.6;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SmartRouter requires GOOGLE_AI_API_KEY');
    }
    this.genai = new GoogleGenAI({ apiKey });
  }

  /**
   * Classify a query using Gemini Flash
   */
  async classifyQuery(
    query: string,
    context?: RouterContext
  ): Promise<QueryRoute> {
    try {
      const prompt = CLASSIFICATION_PROMPT.replace('{query}', query);

      const result = await this.genai.models.generateContent({
        model: ROUTER_MODEL,
        contents: prompt, // Simple string format
        config: {
          temperature: 0,
          maxOutputTokens: 512,
        },
      });

      // Get full text response
      const text = result.text || '';
      const parsed = this.parseClassificationResponse(text, query);

      // Apply confidence threshold
      if (parsed.confidence < this.confidenceThreshold) {
        // Try heuristics before defaulting to casual
        const heuristic = this.quickClassify(query);
        if (heuristic) {
          return {
            ...heuristic,
            reasoning: `Low confidence (${parsed.confidence.toFixed(2)}), using heuristics fallback`,
          };
        }

        return {
          route: this.fallbackRoute,
          confidence: 1.0,
          reasoning: `Low confidence (${parsed.confidence.toFixed(2)}), falling back to casual`,
          estimatedLatencyMs: ROUTE_LATENCY[this.fallbackRoute],
        };
      }

      // Apply context-based adjustments
      const adjusted = this.applyContextAdjustments(parsed, context);

      return {
        ...adjusted,
        estimatedLatencyMs: ROUTE_LATENCY[adjusted.route],
      };
    } catch (error) {
      console.error('[SmartRouter] Classification error:', error);
      // Try heuristics fallback before defaulting to casual
      const heuristic = this.quickClassify(query);
      if (heuristic) {
        return {
          ...heuristic,
          reasoning: `Classification failed, using heuristics fallback: ${heuristic.reasoning}`,
        };
      }

      // Return fallback on error
      return {
        route: this.fallbackRoute,
        confidence: 1.0,
        reasoning: 'Classification failed, using fallback',
        estimatedLatencyMs: ROUTE_LATENCY[this.fallbackRoute],
      };
    }
  }

  /**
   * Parse the JSON response from Gemini
   * Falls back to heuristics if parsing fails
   */
  private parseClassificationResponse(text: string, query?: string): QueryRoute {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate route type
      const validRoutes: RouteType[] = ['rag', 'web', 'memory', 'casual', 'dashboard'];
      if (!validRoutes.includes(parsed.route)) {
        throw new Error(`Invalid route: ${parsed.route}`);
      }

      // Validate confidence
      const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

      return {
        route: parsed.route as RouteType,
        confidence,
        reasoning: parsed.reasoning || '',
        estimatedLatencyMs: ROUTE_LATENCY[parsed.route as RouteType],
      };
    } catch (error) {
      console.warn('[SmartRouter] Parse error:', error);

      // Try heuristics fallback if query provided
      if (query) {
        const heuristic = this.quickClassify(query);
        if (heuristic) {
          return {
            ...heuristic,
            reasoning: `Parse failed, using heuristics fallback: ${heuristic.reasoning}`,
          };
        }
      }

      return {
        route: this.fallbackRoute,
        confidence: 0.5,
        reasoning: 'Failed to parse classification',
        estimatedLatencyMs: ROUTE_LATENCY[this.fallbackRoute],
      };
    }
  }

  /**
   * Apply context-based adjustments to routing
   */
  private applyContextAdjustments(
    route: QueryRoute,
    context?: RouterContext
  ): QueryRoute {
    if (!context) return route;

    // If user has preferred sources and confidence is borderline, bias toward preference
    if (
      context.userPreferences?.preferredSources &&
      route.confidence < 0.8 &&
      context.userPreferences.preferredSources.includes(route.route)
    ) {
      return {
        ...route,
        confidence: Math.min(1, route.confidence + 0.1),
        reasoning: `${route.reasoning} (boosted by user preference)`,
      };
    }

    return route;
  }

  /**
   * Quick keyword-based pre-filter for obvious cases (saves API calls)
   */
  quickClassify(query: string): QueryRoute | null {
    const lower = query.toLowerCase().trim();

    // Obvious memory queries
    if (/^(do you remember|last time|previously|we (discussed|talked)|you mentioned)/i.test(lower)) {
      return {
        route: 'memory',
        confidence: 0.95,
        reasoning: 'Explicit memory recall pattern',
        estimatedLatencyMs: ROUTE_LATENCY.memory,
      };
    }

    // Obvious navigation
    if (/^(go to|navigate to|open|take me to|show me the)\s+(dashboard|settings|analytics|clients)/i.test(lower)) {
      return {
        route: 'dashboard',
        confidence: 0.95,
        reasoning: 'Explicit navigation command',
        estimatedLatencyMs: ROUTE_LATENCY.dashboard,
      };
    }

    // Dashboard data queries - clients, alerts, stats
    if (/(show|list|get|what|give)\s+(me\s+)?(my\s+)?(all\s+)?(the\s+)?(clients?|alerts?|statistics?|stats)/i.test(lower) ||
        /(at[- ]?risk|critical|high\s+priority)\s*(clients?|alerts?)/i.test(lower) ||
        /clients?\s+(at[- ]?risk|with|who|that)/i.test(lower) ||
        /(how many|agency)\s+(clients?|alerts?|stats)/i.test(lower)) {
      return {
        route: 'dashboard',
        confidence: 0.92,
        reasoning: 'Dashboard data query pattern',
        estimatedLatencyMs: ROUTE_LATENCY.dashboard,
      };
    }

    // Obvious greetings
    if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy|what'?s up)[\s!?.]*$/i.test(lower)) {
      return {
        route: 'casual',
        confidence: 0.98,
        reasoning: 'Simple greeting',
        estimatedLatencyMs: ROUTE_LATENCY.casual,
      };
    }

    // Not obvious enough, need AI classification
    return null;
  }

  /**
   * Smart route with quick pre-filter + AI fallback
   */
  async route(query: string, context?: RouterContext): Promise<QueryRoute> {
    // Try quick classification first
    const quick = this.quickClassify(query);
    if (quick) {
      return quick;
    }

    // Use AI classification
    return this.classifyQuery(query, context);
  }
}

// Singleton instance
let routerInstance: SmartRouter | null = null;

/**
 * Get or create SmartRouter instance
 */
export function getSmartRouter(): SmartRouter {
  if (!routerInstance) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    routerInstance = new SmartRouter(apiKey);
  }
  return routerInstance;
}

/**
 * Reset router (for testing)
 */
export function resetSmartRouter(): void {
  routerInstance = null;
}
