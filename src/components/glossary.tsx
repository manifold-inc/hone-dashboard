"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

interface Term {
  term: string
  short: string
  detail?: React.ReactNode
}

const TERMS: Term[] = [
  {
    term: "Window",
    short: "A fixed-length training round (~one block range) inside which all peers train, gather, and (for validators) evaluate.",
  },
  {
    term: "Global Step",
    short: "Number of outer-optimizer updates applied to the shared model since training began.",
  },
  {
    term: "Inner Step",
    short: "One mini-batch update inside a single window. Many inner steps roll up into one outer (global) step.",
  },
  {
    term: "Loss (own)",
    short: "Validator-side reading: model loss on the data a miner says it trained on. Used to verify the miner's gradient actually helps that data.",
  },
  {
    term: "Loss (random)",
    short: "Validator-side reading: model loss on independent random data. Used as a control to detect overfitting.",
  },
  {
    term: "Gradient Quality",
    short: "(loss_own_before − loss_own_after) / loss_own_before. How much the miner's gradient lowers loss on its claimed data. Higher is better.",
  },
  {
    term: "Generalization Gap",
    short: "improvement_own − improvement_random. How much more a gradient helps a miner's chosen data than random data. Near zero is healthy; large positive means the miner is overfitting / cherry-picking.",
  },
  {
    term: "Gather Success",
    short: "Percentage of peers whose gradients were successfully collected and applied during a window.",
  },
  {
    term: "OpenSkill (ordinal)",
    short: "Bayesian skill rating (mu − 3·sigma) used to rank miners over many windows. Higher is better.",
  },
  {
    term: "Final Score",
    short: "The validator's combined score per UID, blending gradient quality, sync, and OpenSkill. Drives weights.",
  },
  {
    term: "Weight",
    short: "Fraction of validator stake this miner will earn next epoch. Derived from final score.",
  },
  {
    term: "Slash",
    short: "An event where the validator penalizes a miner's score (e.g. for an invalid gradient or detected overfitting).",
  },
]

export function Glossary() {
  const [open, setOpen] = React.useState(false)
  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="rounded-md border border-border/60 bg-card/40">
        <CollapsiblePrimitive.Trigger
          className="group/glossary flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card/60"
          aria-label="Toggle glossary"
        >
          <span className="font-mono text-[10px] text-muted-foreground/70 select-none">
            {open ? "\u25BC" : "\u25B6"}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover/glossary:text-foreground">
            Glossary
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/40">
            {TERMS.length} terms
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/60">
            {open ? "hide" : "show"}
          </span>
        </CollapsiblePrimitive.Trigger>
        <CollapsiblePrimitive.Panel className="overflow-hidden data-[ending-style]:h-0 data-[starting-style]:h-0 transition-[height] duration-200 ease-out [height:var(--collapsible-panel-height)]">
          <div className="border-t border-border/40 px-4 py-4">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {TERMS.map((t) => (
                <div key={t.term}>
                  <dt className="font-mono text-[11px] font-medium text-foreground">
                    <span className="mr-2 text-muted-foreground/40">
                      {"\u203A"}
                    </span>
                    {t.term}
                  </dt>
                  <dd className="mt-1 pl-4 text-[11px] leading-relaxed text-muted-foreground">
                    {t.short}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </CollapsiblePrimitive.Panel>
      </div>
    </CollapsiblePrimitive.Root>
  )
}
