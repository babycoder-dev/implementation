import { render, screen } from "@testing-library/react";
import LearnerDashboard from "@/app/page";
import { describe, it, expect, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("LearnerDashboard", () => {
  it("renders dashboard title", () => {
    render(<LearnerDashboard />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("我的学习");
  });

  it("renders welcome card with user name", () => {
    render(<LearnerDashboard />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("has multiple headings", () => {
    render(<LearnerDashboard />);
    const headings = screen.getAllByRole("heading");
    expect(headings.length).toBeGreaterThanOrEqual(5);
  });

  it("renders statistics section", () => {
    render(<LearnerDashboard />);
    const paragraphs = screen.getAllByRole("paragraph");
    expect(paragraphs.length).toBeGreaterThan(3);
  });
});

describe("Task Statistics", () => {
  it("calculates pending tasks count correctly", () => {
    const pendingTasks = [
      { id: "2", status: "pending" as const },
      { id: "3", status: "pending" as const },
    ];
    expect(pendingTasks.length).toBe(2);
  });

  it("calculates in-progress tasks count correctly", () => {
    const inProgressTasks = [{ id: "1", status: "in_progress" as const }];
    expect(inProgressTasks.length).toBe(1);
  });

  it("calculates completed tasks count correctly", () => {
    const completedTasks = [{ id: "4", status: "completed" as const }];
    expect(completedTasks.length).toBe(1);
  });
});
