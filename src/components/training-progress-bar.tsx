import { cn } from "@/lib/utils";

interface TrainingProgressBarProps {
  tokensDone: number | null;
  tokensTarget?: number;
  version?: string | null;
  globalStep?: number | null;
  className?: string;
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export function TrainingProgressBar({
  tokensDone,
  tokensTarget = 2e12,
  version,
  globalStep,
  className,
}: TrainingProgressBarProps) {
  const hasData = tokensDone != null && tokensDone > 0;
  const rawPercent = hasData ? (tokensDone! / tokensTarget) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, rawPercent));

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card/60 px-4 py-3",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Epoch Progress
          {version && (
            <span className="ml-2 font-mono text-muted-foreground/60 normal-case tracking-normal">
              v{version}
            </span>
          )}
        </p>
        <p className="font-mono text-xs tabular-nums text-foreground/90">
          {hasData ? (
            <>
              <span className="text-signal">{formatTokens(tokensDone!)}</span>
              <span className="text-muted-foreground">
                {" / "}
                {formatTokens(tokensTarget)} tokens
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/60">no data</span>
          )}
        </p>
      </div>

      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60 ring-1 ring-foreground/5">
        <div
          className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            boxShadow:
              clamped > 0
                ? "0 0 14px oklch(0.886 0.176 169.5 / 45%)"
                : undefined,
          }}
        />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between text-[10px] text-muted-foreground">
        <span className="font-mono tabular-nums text-signal/80">
          {hasData ? `${rawPercent.toFixed(2)}%` : "\u2014"}
        </span>
        {globalStep != null && (
          <span className="font-mono tabular-nums">
            step {globalStep.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
