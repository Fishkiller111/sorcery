import { useCallback, useEffect, useRef } from 'react';
import { VIP_LEGAL_READY } from '../constants/legal';
import { Platform } from 'react-native';
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as syncRestorePurchases,
  type Purchase,
  type PurchaseError,
} from 'expo-iap';
import { verifyAppleIapPurchase } from '../api/vip';
import { useVipStore } from '../stores/vipStore';
import { formatApiError } from '../utils/roleForm';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';

type Translate = (key: string) => string;

/**
 * iOS StoreKit subscription purchase + restore for VIP.
 * Web / Android should not call this — they keep Stripe Checkout.
 *
 * Guideline 3.1.1: restore must be user-initiated via a distinct control
 * (do not rely on auto-restore at launch alone).
 */
export function useAppleVipPurchase(t: Translate) {
  const fetchVip = useVipStore((s) => s.fetchVip);
  const handlingRef = useRef(false);
  const restoringRef = useRef(false);

  const handlePurchase = useCallback(
    async (purchase: Purchase, opts?: { silentSuccess?: boolean }) => {
      if (handlingRef.current) return false;
      handlingRef.current = true;
      try {
        const productId = purchase.productId;
        const jws = purchase.purchaseToken;
        if (!jws) {
          throw new Error(t('vip.shop.appleIapMissingToken'));
        }
        await verifyAppleIapPurchase({
          signed_transaction: jws,
          product_id: productId,
        });
        await finishTransaction({ purchase, isConsumable: false });
        await fetchVip();
        if (!opts?.silentSuccess) {
          notifySuccess(t('vip.shop.appleIapSuccess'));
        }
        return true;
      } catch (e) {
        if (!opts?.silentSuccess) {
          notifyError(formatApiError(t, e));
        }
        // Do not finishTransaction on verify failure — user can retry / restore.
        throw e;
      } finally {
        handlingRef.current = false;
      }
    },
    [fetchVip, t],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let purchaseSub: { remove: () => void } | undefined;
    let errorSub: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await initConnection();
        if (cancelled) return;
        purchaseSub = purchaseUpdatedListener((purchase) => {
          void handlePurchase(purchase).catch(() => undefined);
        });
        errorSub = purchaseErrorListener((err) => {
          if (err.code === ErrorCode.UserCancelled) return;
          notifyError(err.message || t('vip.shop.appleIapFailed'));
        });
      } catch (e) {
        notifyWarning(t('vip.shop.appleIapUnavailable'));
        if (__DEV__) console.warn('[apple-iap] init failed', e);
      }
    })();

    return () => {
      cancelled = true;
      purchaseSub?.remove();
      errorSub?.remove();
    };
  }, [handlePurchase, t]);

  const purchaseSubscription = useCallback(
    async (appleProductId: string) => {
      if (!VIP_LEGAL_READY) {
        notifyWarning('Privacy policy and terms URLs must be configured before purchases.');
        return;
      }
      if (Platform.OS !== 'ios') {
        notifyWarning(t('vip.shop.appleIapUnavailable'));
        return;
      }
      if (!appleProductId) {
        notifyError(t('vip.shop.appleIapMissingProduct'));
        return;
      }
      try {
        const products = await fetchProducts({ skus: [appleProductId], type: 'subs' });
        const found = (products ?? []).some(
          (p) => p.id === appleProductId,
        );
        if (!found) {
          // StoreKit omitted the SKU — almost always ASC config, not app logic.
          notifyError(`${t('vip.shop.appleIapSkuNotFound')}: ${appleProductId}`);
          if (__DEV__) {
            console.warn('[apple-iap] fetchProducts empty for', appleProductId, products);
          }
          return;
        }
        await requestPurchase({
          request: {
            apple: { sku: appleProductId },
            google: { skus: [appleProductId] },
          },
          type: 'subs',
        });
      } catch (e) {
        notifyError(formatApiError(t, e));
      }
    },
    [t],
  );

  /** User-tapped Restore Purchases (App Store 3.1.1). */
  const restorePurchases = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      notifyWarning(t('vip.shop.appleIapUnavailable'));
      return;
    }
    if (restoringRef.current) return;
    restoringRef.current = true;
    try {
      // Sync StoreKit, then re-query active items (restorePurchases itself does not return the list).
      await syncRestorePurchases();
      const purchases = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      });

      if (!purchases.length) {
        notifyWarning(t('vip.shop.restoreEmpty'));
        return;
      }

      let restored = 0;
      let lastError: unknown;
      for (const purchase of purchases) {
        try {
          const ok = await handlePurchase(purchase, { silentSuccess: true });
          if (ok) restored += 1;
        } catch (e) {
          lastError = e;
        }
      }

      await fetchVip();

      if (restored > 0) {
        notifySuccess(t('vip.shop.restoreSuccess'));
      } else if (lastError) {
        notifyError(formatApiError(t, lastError));
      } else {
        notifyWarning(t('vip.shop.restoreEmpty'));
      }
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      restoringRef.current = false;
    }
  }, [fetchVip, handlePurchase, t]);

  return { purchaseSubscription, restorePurchases };
}
