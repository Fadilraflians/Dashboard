import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { Toast, ToastMessage } from "primereact/toast";

interface ToastContextValue {
  show: (message: ToastMessage | ToastMessage[]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toastRef = useRef<Toast>(null);

  const show = useCallback((message: ToastMessage | ToastMessage[]) => {
    toastRef.current?.show(message);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      <Toast ref={toastRef} position="top-right" />
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Safe toast hook. Returns a no-op when no ToastProvider is present (e.g. if
 * the shell renders the exposed App without wrapping it), so the MFE never
 * crashes due to a missing provider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { show: () => undefined };
  }
  return ctx;
}
