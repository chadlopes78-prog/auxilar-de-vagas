import { APP_NAME } from "@/lib/brand";

export function BrandMark({
  className = "size-8",
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src="/logo.jpg"
      alt={decorative ? "" : APP_NAME}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
}