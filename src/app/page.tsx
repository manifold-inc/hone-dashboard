import Link from "next/link";
import { AsciiSkyBackground } from "@/components/ascii-sky-border";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <AsciiSkyBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-12 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
            Distributed Training Network
          </span>

          <h1 className="mt-8 font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Train Together.
            <br />
            <span className="text-primary">Build What&apos;s Next.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Hone connects independent compute across the globe into a single
            training run. Contributors earn rewards proportional to their
            work&mdash;honest participation is enforced by design, not trust.
            The result: large language models trained by the many, owned by no
            one.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/overview"
              className="rounded border border-primary bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:shadow-[0_0_24px_oklch(0.85_0.32_140/30%)]"
            >
              Open Dashboard
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-border bg-background/50 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
            >
              Read the Docs
            </a>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="relative z-10 border-t border-border/30 px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-12 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Peer-to-Peer Training
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              No central coordinator. Nodes discover each other, exchange
              gradients, and converge on a shared model through direct
              peer-to-peer communication.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Incentive-Aligned
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Quality contributions are rewarded, freeloaders are penalized.
              The scoring mechanism ensures every participant has skin in the
              game.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Open &amp; Transparent
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Every gradient, every score, every weight update is visible
              on-chain. Anyone can audit the training process in real time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
