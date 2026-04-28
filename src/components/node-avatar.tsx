"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { LivenessDot } from "@/components/liveness-dot"
import { cn } from "@/lib/utils"

export type NodeRole = "miner" | "validator"

function truncateHotkey(hotkey: string, headLen = 6, tailLen = 4): string {
  if (hotkey.length <= headLen + tailLen + 3) return hotkey
  return `${hotkey.slice(0, headLen)}...${hotkey.slice(-tailLen)}`
}

export interface NodeAvatarProps {
  hotkey: string
  uid?: number | null
  role?: NodeRole
  showLiveness?: boolean
  showRole?: boolean
  showHotkey?: boolean
  link?: boolean
  className?: string
  hotkeyHead?: number
  hotkeyTail?: number
}

export function NodeAvatar({
  hotkey,
  uid,
  role,
  showLiveness = true,
  showRole = false,
  showHotkey = true,
  link = false,
  className,
  hotkeyHead = 6,
  hotkeyTail = 4,
}: NodeAvatarProps) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 align-middle",
        link && "transition-opacity hover:opacity-80",
        className
      )}
    >
      {showLiveness && <LivenessDot hotkey={hotkey} />}
      {uid !== null && uid !== undefined && (
        <Badge variant="outline" className="font-mono text-[10px]">
          UID {uid}
        </Badge>
      )}
      {showRole && role && (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            role === "validator"
              ? "border-foreground/40 text-foreground"
              : "border-border text-muted-foreground"
          )}
        >
          {role}
        </Badge>
      )}
      {showHotkey && (
        <span
          className="font-mono text-xs text-muted-foreground"
          title={hotkey}
        >
          {truncateHotkey(hotkey, hotkeyHead, hotkeyTail)}
        </span>
      )}
    </span>
  )

  if (link) {
    return (
      <Link
        href={`/nodes/${encodeURIComponent(hotkey)}`}
        className="inline-flex items-center"
      >
        {inner}
      </Link>
    )
  }
  return inner
}

export { truncateHotkey }
