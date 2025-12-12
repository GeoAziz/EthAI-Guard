'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  return (
    <Dialog defaultOpen={open} onOpenChange={(o) => { if (!o) {onCancel();} }}>
      <DialogContent>
        <DialogHeader>
          {title ? <DialogTitle>{title}</DialogTitle> : <DialogTitle>Confirm</DialogTitle>}
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button onClick={onCancel} className="px-3 py-1 border rounded">{cancelLabel}</button>
          <button data-autofocus onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">{confirmLabel}</button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
