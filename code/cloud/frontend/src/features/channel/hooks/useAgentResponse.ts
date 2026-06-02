/**
 * Agent 响应状态管理 Hook
 */

import { useState, useEffect, useRef } from 'react';
import { AgentResponseStatus, AgentResponseState } from '../types/agent-response.types';

export function useAgentResponse(channelId: string) {
  const [responseState, setResponseState] = useState<AgentResponseState | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const handleAccepted = (event: CustomEvent) => {
      if (event.detail.channelId !== channelId) return;
      
      setResponseState({
        status: AgentResponseStatus.ACCEPTED,
        messageId: event.detail.messageId,
        agentId: event.detail.agentId,
        agentName: event.detail.agentName,
        startTime: new Date(),
        estimatedDuration: event.detail.estimatedDuration || 10,
        elapsedTime: 0,
      });
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setResponseState(prev => prev ? {
          ...prev,
          elapsedTime: Math.floor((Date.now() - prev.startTime!.getTime()) / 1000),
        } : null);
      }, 1000);
    };
    
    const handleCompleted = (event: CustomEvent) => {
      if (event.detail.channelId !== channelId) return;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      
      setResponseState(prev => prev ? {
        ...prev,
        status: AgentResponseStatus.COMPLETED,
        finalContent: event.detail.content,
      } : null);
      
      setTimeout(() => setResponseState(null), 3000);
    };
    
    const handleFailed = (event: CustomEvent) => {
      if (event.detail.channelId !== channelId) return;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      
      setResponseState(prev => prev ? {
        ...prev,
        status: AgentResponseStatus.FAILED,
        error: event.detail.error,
      } : null);
    };
    
    window.addEventListener('agent.response.accepted' as any, handleAccepted);
    window.addEventListener('agent.response.completed' as any, handleCompleted);
    window.addEventListener('agent.response.failed' as any, handleFailed);
    
    return () => {
      window.removeEventListener('agent.response.accepted' as any, handleAccepted);
      window.removeEventListener('agent.response.completed' as any, handleCompleted);
      window.removeEventListener('agent.response.failed' as any, handleFailed);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [channelId]);
  
  return responseState;
}
