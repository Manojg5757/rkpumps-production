"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "primary";
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", tone = "danger" }: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">{cancelText}</button>
          <button onClick={onConfirm} className={`${tone === "danger" ? "btn-danger" : "btn-primary"} flex-1`}>{confirmText}</button>
        </div>
      }
    >
      <div className="flex gap-3 items-start">
        {tone === "danger" && (
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
        )}
        <p className="text-sm text-ink-2 pt-2">{message}</p>
      </div>
    </Modal>
  );
}
