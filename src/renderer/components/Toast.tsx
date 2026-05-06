import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastEntry = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;           // ms – default 4500
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;       // default "Confirmar"
  cancelLabel?: string;        // default "Cancelar"
  variant?: 'danger' | 'default';
};

/* ------------------------------------------------------------------ */
/*  Global imperative API  (used across the entire app)                */
/* ------------------------------------------------------------------ */

type ToastPushFn = (type: ToastType, message: string, duration?: number) => void;
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

let _pushToast: ToastPushFn = () => {};
let _confirm: ConfirmFn = () => Promise.resolve(false);

/** Show a toast notification from anywhere. */
export const toast = {
  success: (msg: string, ms?: number) => _pushToast('success', msg, ms),
  error:   (msg: string, ms?: number) => _pushToast('error',   msg, ms),
  warning: (msg: string, ms?: number) => _pushToast('warning', msg, ms),
  info:    (msg: string, ms?: number) => _pushToast('info',    msg, ms),
};

/** Show a styled confirm dialog. Returns a promise → boolean. */
export const confirm = (opts: ConfirmOptions): Promise<boolean> => _confirm(opts);

/* ------------------------------------------------------------------ */
/*  Toast icons (inline SVG paths)                                     */
/* ------------------------------------------------------------------ */

const ICON: Record<ToastType, string> = {
  success: 'M20 6L9 17l-5-5',
  error:   'M18 6L6 18M6 6l12 12',
  warning: 'M12 9v4m0 4h.01M5.07 19h13.86A2 2 0 0020.67 16L13.74 4a2 2 0 00-3.48 0L3.33 16A2 2 0 005.07 19z',
  info:    'M12 8h.01M11 12h1v4h1',
};

/* ------------------------------------------------------------------ */
/*  <ToastItem>                                                        */
/* ------------------------------------------------------------------ */

const ToastItem: React.FC<{
  entry: ToastEntry;
  onDismiss: (id: string) => void;
}> = ({ entry, onDismiss }) => {
  const duration = entry.duration ?? 4500;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setExiting(true), duration);
    return () => clearTimeout(timerRef.current);
  }, [duration]);

  const handleAnimEnd = () => {
    if (exiting) onDismiss(entry.id);
  };

  return (
    <div
      className={`sgc-toast sgc-toast--${entry.type}${exiting ? ' sgc-toast--exit' : ''}`}
      role="alert"
      onAnimationEnd={handleAnimEnd}
    >
      <span className="sgc-toast-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICON[entry.type]} />
        </svg>
      </span>
      <span className="sgc-toast-msg">{entry.message}</span>
      <button
        type="button"
        className="sgc-toast-close"
        aria-label="Cerrar notificación"
        onClick={() => setExiting(true)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <span className="sgc-toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  <ConfirmDialog>                                                    */
/* ------------------------------------------------------------------ */

const ConfirmDialog: React.FC<{
  opts: ConfirmOptions;
  onResult: (ok: boolean) => void;
}> = ({ opts, onResult }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResult(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onResult]);

  return (
    <div className="sgc-confirm-overlay" role="dialog" aria-modal="true" aria-label={opts.title}>
      <div className="sgc-confirm-card">
        <h3 className="sgc-confirm-title">{opts.title}</h3>
        <p className="sgc-confirm-msg">{opts.message}</p>
        <div className="sgc-confirm-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onResult(false)}
          >
            {opts.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn btn-sm ${opts.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => onResult(true)}
          >
            {opts.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  <ToastProvider> — mount once at the app root                       */
/* ------------------------------------------------------------------ */

let _idSeq = 0;

const ToastProvider: React.FC = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [confirmState, setConfirmState] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const push: ToastPushFn = useCallback((type, message, duration) => {
    const id = `t-${++_idSeq}-${Date.now()}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const handleConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ opts, resolve });
    });
  }, []);

  useEffect(() => {
    _pushToast = push;
    _confirm   = handleConfirm;
    return () => {
      _pushToast = () => {};
      _confirm   = () => Promise.resolve(false);
    };
  }, [push, handleConfirm]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleConfirmResult = useCallback((ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }, [confirmState]);

  return (
    <>
      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="sgc-toast-stack" aria-live="polite">
          {toasts.map(t => (
            <ToastItem key={t.id} entry={t} onDismiss={dismiss} />
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog opts={confirmState.opts} onResult={handleConfirmResult} />
      )}
    </>
  );
};

export default ToastProvider;
