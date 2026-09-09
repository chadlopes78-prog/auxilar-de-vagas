import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[10px] border border-border bg-surface px-3 text-base text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-base text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      suppressHydrationWarning
      className={cn(
        "h-12 w-full rounded-[10px] border border-border bg-surface px-3 text-base text-fg focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-xs font-medium uppercase tracking-wide text-muted", className)}
      {...props}
    />
  );
}
