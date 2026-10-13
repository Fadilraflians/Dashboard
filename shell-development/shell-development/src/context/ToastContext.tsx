"use client";

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

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
