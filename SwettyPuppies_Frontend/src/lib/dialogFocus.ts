import type { ObjectDirective } from 'vue';

const cleanup = new WeakMap<HTMLElement, () => void>();
/** Keeps keyboard navigation inside a modal and returns focus to its opener. */
export const vDialogFocus: ObjectDirective<HTMLElement> = {
  mounted(element) {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'
        )
      ).filter((item) => item.getClientRects().length > 0);
    element.tabIndex = -1;
    (focusable()[0] || element).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        element.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cleanup.set(element, () => {
      element.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    });
  },
  unmounted(element) {
    cleanup.get(element)?.();
    cleanup.delete(element);
  }
};
