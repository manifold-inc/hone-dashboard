"use client";

import { useMemo } from "react";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-accent/50 px-1 py-0.5 rounded text-[0.9em] font-mono">$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

export function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => {
    const lines = content.split("\n");
    const blocks: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        blocks.push(
          `<h1 class="text-2xl font-bold tracking-tight mt-8 mb-4 first:mt-0">${parseInline(escapeHtml(line.slice(2)))}</h1>`
        );
        i++;
        continue;
      }

      if (line.startsWith("## ")) {
        blocks.push(
          `<h2 class="text-xl font-bold tracking-tight mt-8 mb-3">${parseInline(escapeHtml(line.slice(3)))}</h2>`
        );
        i++;
        continue;
      }

      if (line.startsWith("### ")) {
        blocks.push(
          `<h3 class="text-lg font-bold tracking-tight mt-6 mb-2">${parseInline(escapeHtml(line.slice(4)))}</h3>`
        );
        i++;
        continue;
      }

      if (line.startsWith("- **")) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) {
          listItems.push(
            `<li class="pl-1">${parseInline(escapeHtml(lines[i].slice(2)))}</li>`
          );
          i++;
        }
        blocks.push(
          `<ul class="space-y-2 my-4 ml-4 list-disc marker:text-primary/40">${listItems.join("")}</ul>`
        );
        continue;
      }

      if (line.startsWith("- ")) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) {
          listItems.push(
            `<li class="pl-1">${parseInline(escapeHtml(lines[i].slice(2)))}</li>`
          );
          i++;
        }
        blocks.push(
          `<ul class="space-y-1.5 my-4 ml-4 list-disc marker:text-muted-foreground/40">${listItems.join("")}</ul>`
        );
        continue;
      }

      if (line.trim() === "") {
        i++;
        continue;
      }

      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("- ")) {
        paraLines.push(escapeHtml(lines[i]));
        i++;
      }
      blocks.push(
        `<p class="my-3 text-sm leading-relaxed text-muted-foreground">${parseInline(paraLines.join(" "))}</p>`
      );
    }

    return blocks.join("");
  }, [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
