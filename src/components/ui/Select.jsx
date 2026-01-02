import React from "react";

export function Select({ className = "", label, id, options, children, ...props }) {
  const selectId = id || (label ? `sel_${label.replace(/\s+/g, "_").toLowerCase()}` : undefined);

  const selectEl = (
    <select
      id={selectId}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring ${className}`}
      {...props}
    >
      {Array.isArray(options)
        ? options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );

  if (!label) return selectEl;

  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      {selectEl}
    </div>
  );
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}
