import { useEffect, useRef } from "react";

interface RobustAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export function RobustAlert({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: RobustAlertProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Focus el botón cuando se abre
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
    onOpenChange(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onOpenChange(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      style={{
        display: open ? "flex" : "none",
        pointerEvents: open ? "auto" : "none",
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 border-2 border-red-600 shadow-lg"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.95)",
          transition: "all 150ms ease-out",
        }}
      >
        <h2 className="text-lg font-bold text-red-600 mb-2">{title}</h2>
        <p className="text-gray-700 text-base mb-6">{message}</p>
        <button
          ref={buttonRef}
          onClick={handleConfirm}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
          type="button"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
