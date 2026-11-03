import { useCallback, useEffect, useState } from 'react';

export const SEND_CODE_COOLDOWN_SEC = 60;

export function useSendCodeCooldown(seconds = SEND_CODE_COOLDOWN_SEC) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const startCooldown = useCallback(() => {
    setCooldown(seconds);
  }, [seconds]);

  const resetCooldown = useCallback(() => {
    setCooldown(0);
  }, []);

  return {
    cooldown,
    canSend: cooldown === 0,
    startCooldown,
    resetCooldown,
  };
}
