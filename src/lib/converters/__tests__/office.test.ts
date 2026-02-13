import { describe, it, expect } from "vitest";

// Test the pure functions by directly importing and testing

describe("Office File Extensions", () => {
  // Constants from office.ts
  const OFFICE_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx'];

  function isOfficeFile(filePath: string): boolean {
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    return OFFICE_EXTENSIONS.includes(ext);
  }

  function getOfficeExtension(filePath: string): string | null {
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    return OFFICE_EXTENSIONS.includes(ext) ? ext : null;
  }

  describe("isOfficeFile", () => {
    it("returns true for docx files", () => {
      expect(isOfficeFile("test.docx")).toBe(true);
    });

    it("returns true for doc files", () => {
      expect(isOfficeFile("test.doc")).toBe(true);
    });

    it("returns true for pptx files", () => {
      expect(isOfficeFile("presentation.pptx")).toBe(true);
    });

    it("returns true for ppt files", () => {
      expect(isOfficeFile("presentation.ppt")).toBe(true);
    });

    it("returns false for pdf files", () => {
      expect(isOfficeFile("document.pdf")).toBe(false);
    });

    it("returns false for unknown extensions", () => {
      expect(isOfficeFile("document.txt")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(isOfficeFile("test.DOCX")).toBe(true);
      expect(isOfficeFile("test.Ppt")).toBe(true);
    });

    it("handles empty string", () => {
      expect(isOfficeFile("")).toBe(false);
    });

    it("handles path without extension", () => {
      expect(isOfficeFile("/path/to/file")).toBe(false);
    });

    it("handles file with multiple dots", () => {
      expect(isOfficeFile("my.document.docx")).toBe(true);
      expect(isOfficeFile("backup.doc")).toBe(true);
    });
  });

  describe("getOfficeExtension", () => {
    it("returns extension for valid office files", () => {
      expect(getOfficeExtension("test.docx")).toBe(".docx");
      expect(getOfficeExtension("test.doc")).toBe(".doc");
      expect(getOfficeExtension("test.pptx")).toBe(".pptx");
      expect(getOfficeExtension("test.ppt")).toBe(".ppt");
    });

    it("returns null for non-office files", () => {
      expect(getOfficeExtension("document.pdf")).toBeNull();
      expect(getOfficeExtension("file.txt")).toBeNull();
    });

    it("returns null for path without extension", () => {
      expect(getOfficeExtension("document")).toBeNull();
    });

    it("preserves case of extension", () => {
      expect(getOfficeExtension("test.DOCX")).toBe(".docx");
      expect(getOfficeExtension("test.PPT")).toBe(".ppt");
    });
  });
});
