import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

describe("Design System", () => {
  const layoutPath = "/home/jack/.worktrees/implementation/src/app/layout.tsx";
  const tailwindPath = "/home/jack/.worktrees/implementation/tailwind.config.ts";

  it("should have Inter font configured", () => {
    const layoutContent = readFileSync(layoutPath, "utf-8");
    expect(layoutContent).toContain('next/font/google');
    expect(layoutContent).toContain('Inter');
    expect(layoutContent).toContain('--font-inter');
    expect(layoutContent).toContain('font-sans');
    expect(layoutContent).toContain('bg-slate-50');
    expect(layoutContent).toContain('text-slate-900');
  });

  it("should have primary color in tailwind config", () => {
    const tailwindContent = readFileSync(tailwindPath, "utf-8");
    expect(tailwindContent).toContain("500: '#6366F1'");
    expect(tailwindContent).toContain("primary");
    expect(tailwindContent).toContain("success: '#10B981'");
    expect(tailwindContent).toContain("warning: '#F59E0B'");
    expect(tailwindContent).toContain("error: '#EF4444'");
    expect(tailwindContent).toContain("fontFamily");
    expect(tailwindContent).toContain("var(--font-inter)");
  });
});
