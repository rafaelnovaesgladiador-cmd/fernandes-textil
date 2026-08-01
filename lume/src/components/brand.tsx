import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Logotipo provisório do Lume. */
export function Brand({
  className,
  size = "md",
  inverse = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
}) {
  const iconSize = size === "lg" ? "size-9" : size === "md" ? "size-8" : "size-6";
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-base";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          inverse && "bg-white/10 text-white",
          iconSize
        )}
      >
        <Sparkles className={size === "sm" ? "size-3.5" : "size-4.5"} />
      </span>
      <span
        className={cn(
          "font-semibold tracking-tight",
          textSize,
          inverse && "text-white"
        )}
      >
        lume
      </span>
    </span>
  );
}
