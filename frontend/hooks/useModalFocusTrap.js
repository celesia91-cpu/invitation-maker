import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (element) =>
      element instanceof HTMLElement &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1 &&
      !element.hidden
  );
};

export default function useModalFocusTrap(isOpen, onClose) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (!isOpen) {
      const previouslyFocused = previousActiveElementRef.current;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      return undefined;
    }

    const modalElement = modalRef.current;
    if (!modalElement) {
      return undefined;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      previousActiveElementRef.current = activeElement;
    } else {
      previousActiveElementRef.current = null;
    }

    const hadTabIndex = modalElement.hasAttribute('tabindex');
    const previousTabIndex = modalElement.getAttribute('tabindex');
    if (!hadTabIndex) {
      modalElement.setAttribute('tabindex', '-1');
    }

    const focusFirstElement = () => {
      const focusableElements = getFocusableElements(modalElement);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modalElement.focus();
      }
    };

    const focusTimer = setTimeout(focusFirstElement, 0);

    const handleKeyDown = (event) => {
      if (!modalRef.current) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const currentFocus = document.activeElement;

      if (event.shiftKey) {
        if (currentFocus === firstElement || !modalRef.current.contains(currentFocus)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (currentFocus === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleFocusIn = (event) => {
      if (!modalRef.current) return;
      if (modalRef.current.contains(event.target)) return;

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modalRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);

      if (!hadTabIndex) {
        modalElement.removeAttribute('tabindex');
      } else if (previousTabIndex !== null) {
        modalElement.setAttribute('tabindex', previousTabIndex);
      }
    };
  }, [isOpen, onClose]);

  return modalRef;
}
