import { APP_NAME } from "@/lib/brand";

export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src="/logo.jpg"
      alt={APP_NAME}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
}
