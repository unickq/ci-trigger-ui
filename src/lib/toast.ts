type ToastStatus = "success" | "error";
type Listener = (message: string, status: ToastStatus) => void;

let _listener: Listener | null = null;

export function setToastListener(fn: Listener) {
  _listener = fn;
}

export function toast(message: string, status: ToastStatus = "success") {
  _listener?.(message, status);
}
