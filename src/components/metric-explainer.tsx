"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface MetricExplainerProps {
  title: string
  /** One short sentence shown directly under the title. Plain English, no jargon. */
  plainSubtitle?: string
  /** Rich content shown when the user opens the info popover. */
  info?: React.ReactNode
  /** Optional headline value badge in the corner (e.g. latest reading). */
  headlineValue?: React.ReactNode
  /** Optional trailing action (e.g. raw values toggle). */
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

export function MetricExplainer({
  title,
  plainSubtitle,
  info,
  headlineValue,
  action,
  className,
  contentClassName,
  children,
}: MetricExplainerProps) {
  return (
    <Card className={cn("bg-card/60", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              <span>{title}</span>
              {info && (
                <Popover>
                  <PopoverTrigger
                    aria-label={`About ${title}`}
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border/60 text-[8px] font-medium text-muted-foreground/60 transition-colors hover:border-primary/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    i
                  </PopoverTrigger>
                  <PopoverContent className="text-xs leading-relaxed">
                    <div className="space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {title}
                      </p>
                      <div className="text-foreground/90">{info}</div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </CardTitle>
            {plainSubtitle && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {plainSubtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headlineValue !== undefined && headlineValue !== null && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {headlineValue}
              </Badge>
            )}
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
