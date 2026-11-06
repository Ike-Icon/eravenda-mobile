/**
 * BLOCKED STORES
 * The server keeps the list (so it follows the person to a new phone). This context holds a copy and the app
 * filters those stores' products out of what the person browses (Home, search suggestions).
 *  signed in -> GET /blocks/stores.  signed out -> cleared.
 *  block/unblock -> API call, then update the local set.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { moderationService } from '../services/moderationService';
import type { BlockedStore } from '../types/api';
import { useAuth } from './AuthContext';

interface BlockValue {
  blocked: BlockedStore[];
  blockedIds: Set<string>;
  block: (storeId: string, storeName: string) => Promise<void>;
  unblock: (storeId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const BlockContext = createContext<BlockValue | null>(null);

export function BlockProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [blocked, setBlocked] = useState<BlockedStore[]>([]);

  const refresh = useCallback(async () => {
    if (status !== 'signedIn') return;
    setBlocked(await moderationService.blockedStores());
  }, [status]);

  useEffect(() => {
    if (status === 'signedIn') void refresh().catch(() => undefined);
    else setBlocked([]);
  }, [status, refresh]);

  const value = useMemo<BlockValue>(
    () => ({
      blocked,
      blockedIds: new Set(blocked.map((b) => b.store_id)),
      refresh,
      block: async (storeId, storeName) => {
        await moderationService.block(storeId);
        setBlocked((l) => (l.some((b) => b.store_id === storeId) ? l : [{ store_id: storeId, store_name: storeName }, ...l]));
      },
      unblock: async (storeId) => {
        await moderationService.unblock(storeId);
        setBlocked((l) => l.filter((b) => b.store_id !== storeId));
      },
    }),
    [blocked, refresh],
  );

  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
}

export function useBlocks(): BlockValue {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlocks must be used inside <BlockProvider>');
  return ctx;
}
