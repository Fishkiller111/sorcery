import { useCallback, useRef, useState } from 'react';
import { TurnstileModal } from '../components/auth/TurnstileModal';
import { isTurnstileEnabled } from '../constants/config';

export function useTurnstileGate() {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((token: string | null) => void) | null>(null);

  const requestToken = useCallback((): Promise<string | null> => {
    if (!isTurnstileEnabled()) return Promise.resolve('');
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setVisible(true);
    });
  }, []);

  const finish = useCallback((token: string | null) => {
    setVisible(false);
    resolveRef.current?.(token);
    resolveRef.current = null;
  }, []);

  const handleSuccess = useCallback(
    (token: string) => {
      finish(token);
    },
    [finish],
  );

  const handleCancel = useCallback(() => {
    finish(null);
  }, [finish]);

  const gate = (
    <TurnstileModal visible={visible} onSuccess={handleSuccess} onCancel={handleCancel} />
  );

  return { requestToken, gate };
}
