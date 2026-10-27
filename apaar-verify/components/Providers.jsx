'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/* ------------------------------- Auth ----------------------------------- */
const AuthCtx = createContext({ user: undefined, refresh: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthCtx);

/* ------------------------------- Toasts --------------------------------- */
const ToastCtx = createContext({ toast: { success() {}, error() {}, info() {} } });
export const useToast = () => useContext(ToastCtx).toast;

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE = {
  success: 'border-ok text-ok',
  error: 'border-danger text-danger',
  info: 'border-brand text-brand',
};

export default function Providers({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6500 : 4000);
    },
    [dismiss],
  );
  const toastApi = useRef({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  });
  toastApi.current = { success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) };

  return (
    <AuthCtx.Provider value={{ user, refresh, logout, setUser }}>
      <ToastCtx.Provider value={{ toast: toastApi.current }}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end" role="region" aria-label="Notifications" aria-live="polite">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = ICON[t.type];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-2 bg-card p-3.5 text-sm ${TONE[t.type]}`}
                  role={t.type === 'error' ? 'alert' : 'status'}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p className="flex-1 text-ink">{t.message}</p>
                  <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded p-0.5 text-muted hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}
