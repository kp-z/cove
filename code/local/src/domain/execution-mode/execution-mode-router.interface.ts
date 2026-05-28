/**
 * Execution Mode Router Interface
 */

export interface ExecutionMode {
  mode: 'cloud' | 'local' | 'hybrid';
  reason?: string;
}

export interface ExecutionModeRouter {
  /**
   * Determine execution mode for a channel
   */
  determineMode(channelId: string): Promise<ExecutionMode>;

  /**
   * Set execution mode for a channel
   */
  setMode(channelId: string, mode: 'cloud' | 'local' | 'hybrid'): Promise<void>;
}
