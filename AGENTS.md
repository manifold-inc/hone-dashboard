<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-context -->
## Design Context

Before changing any UI, read [`PRODUCT.md`](../PRODUCT.md) (strategy, users, voice, anti-references) and [`DESIGN.md`](../DESIGN.md) (visual tokens and rules). Both live at the repo root.

Load both in one call:

```bash
node .agents/skills/impeccable/scripts/load-context.mjs
```

Cheat-sheet for this dashboard:

- **Register**: product. Optimized for three audiences in equal weight (operators, ML researchers, auditors).
- **Creative North Star**: "The Telemetry Console" — Bloomberg-terminal density, monospace-only, hairline borders over near-black, every pixel reports.
- **The Two-Palette Rule** (most-violated): action amber (`oklch(0.79 0.15 62)` aka `--primary`) and signal mint (`#32ffc8` aka `--signal`) live in separate worlds. A button is never mint. A chart line is never amber. A liveness dot is never amber. A nav pill is never mint.
- **Mono-Only Rule**: no sans-serif, ever. Space Mono for text, JetBrains Mono for tabular numbers.
- **Caps-Label Rule**: section headers are `text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground`. They function as gauges, not headings.
- **Hairline Rule**: panel separation is `ring-1 ring-foreground/10` or `border-border/60`, exactly 1px. No thicker, no gradient, no glow.
- **Pulse-Means-Live Rule**: animation only on liveness dots and the training-progress glow. Don't animate state transitions or hover.
- **Every chart wraps `<MetricExplainer>`**: title, plain-English subtitle, info popover citing the source database field. Bare `<TimeSeriesChart>` outside demo code is an anti-pattern.

Run `$impeccable critique <page>` against any surface to evaluate it against this spec, or `$impeccable polish <page>` for a quality pass.
<!-- END:design-context -->
