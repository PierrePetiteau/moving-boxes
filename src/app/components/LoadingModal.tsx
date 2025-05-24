import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

interface LoadingModalProps {
  isLoading: boolean;
  message?: string;
  autoDismissAfter?: number;
  onDismiss?: () => void;
}

export default function LoadingModal({
  isLoading,
  message = "Loading...",
  autoDismissAfter = 3000,
  onDismiss,
}: LoadingModalProps) {
  const [show, setShow] = useState(isLoading);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
      setIsComplete(false);
    } else if (show) {
      // When loading stops, show completion state
      setIsComplete(true);
      if (autoDismissAfter > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          setIsComplete(false);
          onDismiss?.();
        }, autoDismissAfter);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
      setIsComplete(false);
    }
  }, [isLoading, autoDismissAfter, onDismiss, show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {isComplete ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          )}
          <p className="text-gray-700 text-center">{message}</p>
          <button
            onClick={() => {
              setShow(false);
              setIsComplete(false);
              onDismiss?.();
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
