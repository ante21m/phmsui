'use client';
import { useEffect } from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export default function ConfirmModal({
  open,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.text}>
          {message}
          {itemName && <> <strong>{itemName}</strong></>}
          This action cannot be undone.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>{cancelText}</button>
          <button
            className={`${styles.confirmBtn} ${variant === 'danger' ? styles.dangerBtn : styles.primaryBtn}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
