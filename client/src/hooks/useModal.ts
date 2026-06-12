import { useEffect, useRef, useCallback } from 'react';

/**
 * Reusable hook for accessible modal dialogs.
 *
 * Provides:
 * - Escape key to close
 * - Focus trap (Tab / Shift+Tab cycle within the modal)
 * - Focus restoration to the previously-focused element on close
 *
 * Usage:
 *   const { modalRef } = useModal(isOpen, onClose);
 *   <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="...">
 */
export function useModal(isOpen: boolean, onClose: () => void) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap handler
  const handleTab = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Add listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTab);

    // Focus the first focusable element inside the modal (deferred to let render complete)
    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      // If something inside already has autoFocus, respect that
      if (modalRef.current.contains(document.activeElement)) return;
      const first = modalRef.current.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTab);
      clearTimeout(timer);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown, handleTab]);

  return { modalRef };
}
