"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "time"
    | "number"
    | "select"
    | "textarea";
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  required?: boolean;
  /** Half-width on >= sm screens. */
  half?: boolean;
  min?: number;
  max?: number;
};

/**
 * Showcase form: validates natively, then simulates a request and shows the success state.
 * Nothing is sent anywhere — the templates are static demos with no backend.
 */
export function DemoForm({
  fields,
  submit,
  success,
  note,
  className,
  inputClassName,
  labelClassName,
  buttonClassName,
  successClassName,
}: {
  fields: FormField[];
  submit: string;
  success: { title: string; text: string; again: string };
  note?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  buttonClassName?: string;
  successClassName?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const id = useId();
  const doneRef = useRef<HTMLDivElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("loading");
    window.setTimeout(() => {
      setState("done");
      form.reset();
      window.setTimeout(() => doneRef.current?.focus(), 30);
    }, 800);
  }

  if (state === "done")
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "menu-enter-d flex min-h-[320px] flex-col items-center justify-center text-center",
          successClassName,
        )}
      >
        <CheckCircle2 className="size-12 text-d-accent" aria-hidden="true" />
        <h3 className="mt-4 text-2xl font-bold">{success.title}</h3>
        <p className="mt-2 max-w-sm text-d-muted">{success.text}</p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-6 text-sm font-semibold underline underline-offset-4"
        >
          {success.again}
        </button>
      </div>
    );

  const base =
    "w-full rounded-lg border px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-d-accent focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-d-accent)_18%,transparent)]";

  return (
    <form
      onSubmit={onSubmit}
      className={cn("grid gap-4 sm:grid-cols-2", className)}
    >
      {fields.map((f) => {
        const fid = `${id}-${f.name}`;
        const common = {
          id: fid,
          name: f.name,
          required: f.required ?? true,
          placeholder: f.placeholder,
          className: cn(base, inputClassName),
        };
        return (
          <div
            key={f.name}
            className={cn("flex flex-col gap-1.5", !f.half && "sm:col-span-2")}
          >
            <label
              htmlFor={fid}
              className={cn("text-sm font-semibold", labelClassName)}
            >
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea {...common} rows={5} />
            ) : f.type === "select" ? (
              <select {...common} defaultValue={f.defaultValue ?? ""}>
                <option value="" disabled>
                  {f.placeholder ?? "—"}
                </option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={f.type ?? "text"}
                min={f.min}
                max={f.max}
              />
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={state === "loading"}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-7 font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-60",
            buttonClassName,
          )}
        >
          {state === "loading" && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {submit}
        </button>
        {note && <p className="text-xs text-d-muted">{note}</p>}
      </div>
    </form>
  );
}
