"use client";

import { ReactNode } from "react";

/**
 * The invoice "readout": large running total + primary action.
 * Fixed to the bottom of the screen on phones, inline on desktop.
 */
export function TotalBar({ amount, caption, actionLabel, onAction, loading, disabled, secondary }: {
  amount: string;
  caption?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: ReactNode;
}) {
  return (
    <>
      {/* spacer so content isn't hidden behind the fixed bar on phones */}
      <div className="h-24 md:hidden" />
      <div
        className="fixed md:sticky inset-x-0 bottom-0 z-40 md:mt-4 md:rounded-xl bg-ink text-white"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3 px-4 pt-3 md:pb-0">
          <div className="flex-1 min-w-0">
            <p className="num text-[26px] md:text-[28px] leading-none font-semibold tracking-tight">{amount}</p>
            {caption && <p className="text-xs text-white/60 mt-1 truncate">{caption}</p>}
          </div>
          {secondary}
          <button
            onClick={onAction}
            disabled={disabled || loading}
            className="btn h-12 px-5 bg-white text-ink hover:bg-brand-50 text-[15px]"
          >
            {loading ? <span className="h-5 w-5 border-2 border-ink border-t-transparent rounded-full animate-spin" /> : actionLabel}
          </button>
        </div>
      </div>
    </>
  );
}
