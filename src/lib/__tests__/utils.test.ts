import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatFileSize, getStatusColor, getStatusText, cn } from "../utils";

describe("cn", () => {
  it("combines class names", () => {
    expect(cn("text-red", "bg-blue")).toBe("text-red bg-blue");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "inactive")).toBe("base");
  });
});

describe("formatDate", () => {
  it("formats null date", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("formats date string", () => {
    expect(formatDate("2024-02-10")).toContain("2024");
  });

  it("formats Date object", () => {
    expect(formatDate(new Date("2024-02-10"))).toContain("2024");
  });
});

describe("formatDateTime", () => {
  it("formats null datetime", () => {
    expect(formatDateTime(null)).toBe("-");
  });

  it("formats datetime string", () => {
    expect(formatDateTime("2024-02-10T10:30:00")).toContain("2024");
  });
});

describe("formatFileSize", () => {
  it("formats zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
  });
});

describe("getStatusColor", () => {
  it("returns yellow for pending", () => {
    expect(getStatusColor("pending")).toContain("yellow");
  });

  it("returns blue for in_progress", () => {
    expect(getStatusColor("in_progress")).toContain("blue");
  });

  it("returns green for completed", () => {
    expect(getStatusColor("completed")).toContain("green");
  });

  it("returns gray for unknown status", () => {
    expect(getStatusColor("unknown")).toContain("gray");
  });
});

describe("getStatusText", () => {
  it("returns 待开始 for pending", () => {
    expect(getStatusText("pending")).toBe("待开始");
  });

  it("returns 进行中 for in_progress", () => {
    expect(getStatusText("in_progress")).toBe("进行中");
  });

  it("returns 已完成 for completed", () => {
    expect(getStatusText("completed")).toBe("已完成");
  });

  it("returns original text for unknown status", () => {
    expect(getStatusText("unknown")).toBe("unknown");
  });
});
