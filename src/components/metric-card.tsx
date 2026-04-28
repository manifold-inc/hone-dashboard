import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("bg-card/60", className)}>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-positive",
                trend === "down" && "text-negative",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2014"}
            </span>
          )}
        </div>
        {subValue && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}
