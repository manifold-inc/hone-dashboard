"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SECTION_ORDER: Record<string, string[]> = {
  Training: [
    "sequence_length",
    "micro_batch_size",
    "target_batch_size",
    "batch_size",
    "inner_steps",
    "outer_learning_rate",
    "weight_decay",
    "max_grad_norm",
    "warmup_steps",
    "alpha_f",
    "t_max_scheduler",
    "outer_steps_per_shard",
    "eval_lr_factor",
  ],
  Model: [
    "model_size",
    "tokenizer_name",
    "hidden_size",
    "num_hidden_layers",
    "num_attention_heads",
    "num_key_value_heads",
    "intermediate_size",
    "activation_function",
    "max_position_embeddings",
    "vocab_size",
    "rope_theta",
    "rms_norm_eps",
  ],
  Network: [
    "blocks_per_window",
    "windows_per_weights",
    "momentum_decay",
    "topk_compression",
    "target_chunk",
    "gather_peer_count",
    "gather_share",
    "gather_top_ratio",
    "reserve_peer_count",
    "reserve_decay_ratio",
    "minimum_peers",
    "peer_replacement_frequency",
    "peer_list_window_margin",
    "active_check_interval",
    "recent_windows",
  ],
  Scoring: [
    "power_normalisation",
    "binary_score_ma_alpha",
    "bma_threshold",
    "bma_warmup_windows",
    "missing_gradient_penalty_score",
    "openskill_beta",
    "openskill_tau",
    "num_evaluation_bins",
    "uids_per_window",
    "consecutive_negative_threshold",
    "exclude_negative_peers",
    "gather_peers_slash_threshold",
    "idx_overlap_threshold",
    "incentive_burn_rate",
  ],
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(1);
    return value.toString();
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function ParamRow({ name, value }: { name: string; value: unknown }) {
  const isComplex = typeof value === "object" && value !== null;

  if (isComplex) {
    return (
      <CollapsibleSection title={name} defaultOpen={false}>
        <div className="space-y-0.5">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <ParamRow key={k} name={k} value={v} />
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-1 text-xs hover:bg-accent/30 rounded-sm">
      <span className="text-muted-foreground font-mono shrink-0">{name}</span>
      <span className="font-mono text-foreground text-right truncate">
        {formatValue(value)}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/40 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium bg-accent/20 hover:bg-accent/40 transition-colors"
      >
        <svg
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </span>
      </button>
      {open && <div className="py-1">{children}</div>}
    </div>
  );
}

export function HparamsViewer({
  config,
  className,
}: {
  config: Record<string, unknown>;
  className?: string;
}) {
  const categorized = new Set<string>();
  const sections: { title: string; entries: [string, unknown][] }[] = [];

  for (const [sectionName, keys] of Object.entries(SECTION_ORDER)) {
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      if (key in config) {
        entries.push([key, config[key]]);
        categorized.add(key);
      }
    }
    if (entries.length > 0) {
      sections.push({ title: sectionName, entries });
    }
  }

  const remaining: [string, unknown][] = [];
  for (const [key, value] of Object.entries(config)) {
    if (!categorized.has(key) && key !== "spec_version" && key !== "project") {
      remaining.push([key, value]);
    }
  }

  if (remaining.length > 0) {
    const complexEntries = remaining.filter(
      ([, v]) => typeof v === "object" && v !== null
    );
    const simpleEntries = remaining.filter(
      ([, v]) => typeof v !== "object" || v === null
    );

    for (const [key, value] of complexEntries) {
      sections.push({
        title: key,
        entries: Object.entries(value as Record<string, unknown>),
      });
      categorized.add(key);
    }

    if (simpleEntries.length > 0) {
      sections.push({ title: "Other", entries: simpleEntries });
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {sections.map((section) => (
        <CollapsibleSection key={section.title} title={section.title}>
          <div className="space-y-0.5">
            {section.entries.map(([key, value]) => (
              <ParamRow key={key} name={key} value={value} />
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
