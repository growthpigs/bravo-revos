/**
 * OrchestrationResponseBuilder
 *
 * Builds orchestration responses that include:
 * - Text message to user
 * - Orchestration instructions (navigate, fill forms, etc)
 * - Inline buttons for user actions
 * - Session ID for continuity
 * - Memory context flags
 */

export interface OrchestrationInstruction {
  navigate?: string;
  message?: string;
  fillFields?: Array<{
    id: string;
    value: any;
    animated?: boolean;
  }>;
  clickButton?: string;
  wait?: number;
}

export interface InlineButtonConfig {
  label: string;
  action?: string;
  navigateTo?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

export interface OrchestrationResponse {
  response: string; // Text message to user
  orchestration?: OrchestrationInstruction;
  buttons?: InlineButtonConfig[];
  sessionId?: string;
  shouldRememberContext?: boolean;
}

/**
 * Builder pattern for constructing orchestration responses
 *
 * Example usage:
 * ```typescript
 * const response = new OrchestrationResponseBuilder()
 *   .withMessage("Let's create your campaign")
 *   .withNavigation('/dashboard/campaigns/new', 'Opening campaign builder...')
 *   .withButton('START', { navigateTo: '/dashboard/campaigns/new' })
 *   .withSessionId(session.id)
 *   .build();
 * ```
 */
export class OrchestrationResponseBuilder {
  private response: OrchestrationResponse = {
    response: ''
  };

  /**
   * Set the text message to send to the user
   */
  withMessage(message: string): this {
    this.response.response = message;
    return this;
  }

  /**
   * Add navigation instruction - tells the AI to navigate to a path
   */
  withNavigation(path: string, message?: string): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.navigate = path;
    if (message) {
      this.response.orchestration.message = message;
    }
    return this;
  }

  /**
   * Add form fill instructions - tells the AI to fill form fields
   */
  withFormFills(fields: Array<{ id: string; value: any; animated?: boolean }>): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.fillFields = fields;
    return this;
  }

  /**
   * Add an inline button to the response
   *
   * Buttons can either:
   * - Navigate to a path: { navigateTo: '/path' }
   * - Execute an action: { action: 'tool_name' }
   * - Both: { action: 'tool', navigateTo: '/path' }
   */
  withButton(label: string, config: Partial<Omit<InlineButtonConfig, 'label'>> = {}): this {
    if (!this.response.buttons) {
      this.response.buttons = [];
    }
    this.response.buttons.push({
      label,
      ...config
    });
    return this;
  }

  /**
   * Add a wait instruction - tells the executor to wait before proceeding
   */
  withWait(milliseconds: number): this {
    if (!this.response.orchestration) {
      this.response.orchestration = {};
    }
    this.response.orchestration.wait = milliseconds;
    return this;
  }

  /**
   * Set the session ID for continuation
   */
  withSessionId(sessionId: string): this {
    this.response.sessionId = sessionId;
    return this;
  }

  /**
   * Flag whether this context should be remembered in Mem0
   */
  withMemoryContext(remember: boolean = true): this {
    this.response.shouldRememberContext = remember;
    return this;
  }

  /**
   * Build and return the final response object
   */
  build(): OrchestrationResponse {
    return this.response;
  }
}
