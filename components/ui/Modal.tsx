"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Full screen on phones (for long forms / pickers) */
  fullOnMobile?: boolean;
}

const sizes = { sm: "md:max-w-sm", md: "md:max-w-lg", lg: "md:max-w-2xl", xl: "md:max-w-4xl" };

/**
 * Bottom sheet on phones, centred dialog on desktop.
 */
export function Modal({ title, subtitle, onClose, children, footer, size = "md", fullOnMobile }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50 animate-[fade_150ms_ease-out]" onClick={onClose} />
      <div
        className={`relative w-full ${sizes[size]} bg-white flex flex-col shadow-2xl
          ${fullOnMobile ? "h-[100dvh] md:h-auto md:max-h-[90vh]" : "max-h-[92dvh] md:max-h-[90vh]"}
          ${fullOnMobile ? "rounded-none" : "rounded-t-2xl"} md:rounded-2xl
          animate-[sheet_200ms_cubic-bezier(.2,.8,.2,1)] md:animate-[pop_160ms_ease-out]`}
      >
        {!fullOnMobile && <div className="md:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-line" />}
        <div className="flex items-start justify-between gap-3 px-5 pb-3 border-b border-line" style={{ paddingTop: fullOnMobile ? "max(1rem, env(safe-area-inset-top))" : "1rem" }}>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="icon-btn -mr-2 -mt-1 shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 pt-3 bg-white md:rounded-b-2xl" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>{footer}</div>}
      </div>
      <style>{`
        @keyframes sheet { from { transform: translateY(24px); opacity: .6 } to { transform: none; opacity: 1 } }
        @keyframes pop { from { transform: scale(.97); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
