import React from "react";

export function Input({ className = "", label, id, ...props }) {
  const inputId = id || (label ? `inp_${label.replace(/\s+/g, "_").toLowerCase()}` : undefined);

  const inputEl = (
    <input
      id={inputId}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring ${className}`}
      {...props}
    />
  );

  if (!label) return inputEl;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      {inputEl}
    </div>
  );
}
