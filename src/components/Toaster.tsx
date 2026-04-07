import { useEffect, useState } from "react";
import { setToastListener } from "@/lib/toast";

type ToastItem = { id: number; message: string; status: "success" | "error" };

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    setToastListener((message, status) => {
      const id = counter++;
      setToasts((prev) => [...prev, { id, message, status }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl border px-4 py-2 text-sm shadow-xl backdrop-blur-sm ${
            t.status === "success"
              ? "border-atom-green/40 bg-atom-surface text-atom-green"
              : "border-atom-red/40 bg-atom-surface text-atom-red"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
