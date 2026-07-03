import { useEffect } from "react";

interface SimpleAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export function SimpleAlert({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: SimpleAlertProps) {
  useEffect(() => {
    if (open) {
      // Prevenir scroll cuando el modal está abierto
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 border-2 border-red-600 shadow-lg">
        <h2 className="text-lg font-bold text-red-600 mb-2">{title}</h2>
        <p className="text-gray-700 text-base mb-6">{message}</p>
        <button
          onClick={handleConfirm}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
