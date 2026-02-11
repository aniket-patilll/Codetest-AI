/**
 * Hook for monitoring and reporting integrity events during tests
 */
import { useEffect, useRef, useCallback } from 'react';
import { recordIntegrityEvent, IntegrityEventType } from '../lib/api';

interface UseIntegrityMonitorOptions {
  participantId: string;
  enabled?: boolean;
}

export function useIntegrityMonitor({ participantId, enabled = true }: UseIntegrityMonitorOptions) {
  const isMonitoring = useRef(false);

  const reportEvent = useCallback(async (eventType: IntegrityEventType, metadata?: Record<string, unknown>) => {
    if (!enabled || !participantId) return;
    
    try {
      await recordIntegrityEvent({
        participant_id: participantId,
        event_type: eventType,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });
    } catch (error) {
      console.error('Failed to record integrity event:', error);
    }
  }, [participantId, enabled]);

  useEffect(() => {
    if (!enabled || isMonitoring.current) return;
    isMonitoring.current = true;

    // Tab visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportEvent('tab_switch');
      }
    };

    // Window blur (switching to another app)
    const handleWindowBlur = () => {
      reportEvent('window_blur');
    };

    // Copy event
    const handleCopy = (e: ClipboardEvent) => {
      reportEvent('copy_paste', { action: 'copy' });
    };

    // Paste event
    const handlePaste = (e: ClipboardEvent) => {
      reportEvent('paste');
    };

    // Right-click / context menu
    const handleContextMenu = (e: MouseEvent) => {
      reportEvent('right_click', { x: e.clientX, y: e.clientY });
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      isMonitoring.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, reportEvent]);

  return { reportEvent };
}
