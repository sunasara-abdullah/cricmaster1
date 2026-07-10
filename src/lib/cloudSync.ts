import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight cloud mirror for the app's localStorage-backed stores.
 *
 * The matches / teams / leagues data layers keep their fast synchronous
 * localStorage API. On every write they call `pushStore` (fire-and-forget)
 * to mirror the whole store into the user's cloud row, and on login/reload
 * `hydrateFromCloud` pulls the cloud copy back into localStorage so the data
 * follows the user across sessions and devices.
 */

// store_key (localStorage key) -> DOM event that pages listen to for refresh
export const SYNCED_STORES: Record<string, string> = {
  "cricmaster:matches:v1": "cricmaster:matches-updated",
  "cricmaster:teams:v1": "cricmaster:teams-updated",
  "cricmaster:leagues:v1": "cricmaster:leagues-updated",
};

let currentUserId: string | null = null;

export function setSyncUser(userId: string | null) {
  currentUserId = userId;
}

async function resolveUserId(): Promise<string | null> {
  if (currentUserId) return currentUserId;
  try {
    const { data } = await supabase.auth.getSession();
    currentUserId = data.session?.user.id ?? null;
  } catch {
    currentUserId = null;
  }
  return currentUserId;
}

/** Mirror a whole store blob to the cloud. No-op when signed out. */
export async function pushStore(storeKey: string, data: unknown): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;
  try {
    await supabase
      .from("user_app_data")
      .upsert(
        { user_id: userId, store_key: storeKey, data: data as never },
        { onConflict: "user_id,store_key" },
      );
  } catch {
    /* offline / transient — local copy is still saved */
  }
}

/** Fire-and-forget helper used inside synchronous save() functions. */
export function queuePush(storeKey: string, data: unknown) {
  void pushStore(storeKey, data);
}

/**
 * Pull every synced store from the cloud into localStorage, then notify the UI.
 * Cloud is the source of truth for a signed-in user. Returns true on success.
 */
export async function hydrateFromCloud(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await resolveUserId();
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from("user_app_data")
      .select("store_key, data")
      .eq("user_id", userId);
    if (error) throw error;

    const byKey = new Map<string, unknown>();
    for (const row of data ?? []) byKey.set(row.store_key, row.data);

    for (const [storeKey, eventName] of Object.entries(SYNCED_STORES)) {
      if (byKey.has(storeKey)) {
        // Cloud has data → make local match it.
        window.localStorage.setItem(storeKey, JSON.stringify(byKey.get(storeKey)));
      } else {
        // Cloud empty but local has data (e.g. scored while logged out) → push up.
        const local = window.localStorage.getItem(storeKey);
        if (local && local !== "{}") void pushStore(storeKey, JSON.parse(local));
      }
      window.dispatchEvent(new Event(eventName));
    }
    return true;
  } catch {
    return false;
  }
}

/** Clear local cricmaster data (used on sign-out so the next user starts clean). */
export function clearLocalStores() {
  if (typeof window === "undefined") return;
  for (const storeKey of Object.keys(SYNCED_STORES)) {
    window.localStorage.removeItem(storeKey);
    window.dispatchEvent(new Event(SYNCED_STORES[storeKey]));
  }
}
