import { cn } from "@/lib/utils";

export function Alert({ variant = "info", className, title, children }) {
  const variants = {
    info: "border-slate-200 bg-slate-50 text-slate-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        variants[variant],
        className
      )}
    >
      {title && <div className="font-medium">{title}</div>}
      {children && <div className={cn(title ? "mt-1" : "")}>{children}</div>}
    </div>
  );
}
