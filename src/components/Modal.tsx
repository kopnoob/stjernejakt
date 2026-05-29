import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  onClose: () => void;
  /** id på overskriften inni dialogen (aria-labelledby). */
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * H1: tilgjengelig dialog.
 *  - role="dialog" + aria-modal
 *  - Esc lukker
 *  - fokus flyttes inn ved åpning og felles tilbake til utløseren ved lukking
 *  - Tab-syklus holdes inni dialogen (focus trap)
 */
export default function Modal({ onClose, labelledBy, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = (document.activeElement as HTMLElement) ?? null;
    const node = ref.current;

    const focusables = (): HTMLElement[] =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Flytt fokus inn (første interaktive element, ellers selve dialogen).
    (focusables()[0] ?? node)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) {
          e.preventDefault();
          return;
        }
        const active = document.activeElement as HTMLElement;
        const idx = f.indexOf(active);
        if (e.shiftKey && (idx <= 0)) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && idx === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className={`sheet ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
