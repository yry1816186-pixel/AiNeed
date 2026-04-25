import { useCallback, useState } from "react";

/**
 * Hook for managing try-on share privacy confirmation.
 *
 * Before sharing a try-on image, the user must explicitly confirm that
 * the share image only shows try-on results and will not expose real photos.
 */
export function useSharePrivacy() {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requestConfirmation = useCallback(() => setShowConfirm(true), []);

  const confirm = useCallback(() => {
    setHasConfirmed(true);
    setShowConfirm(false);
  }, []);

  const cancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return { hasConfirmed, showConfirm, requestConfirmation, confirm, cancel };
}
