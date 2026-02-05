import { render, screen } from "@testing-library/react"
import { Card, CardHeader, CardTitle, CardContent } from "../card"
import { Button } from "../button"

describe("UI Components", () => {
  describe("Card", () => {
    it("renders card with children", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>Test Content</CardContent>
        </Card>
      )
      expect(screen.getByText("Test Title")).toBeInTheDocument()
      expect(screen.getByText("Test Content")).toBeInTheDocument()
    })

    it("applies rounded-lg and shadow-sm classes", () => {
      render(<Card data-testid="card" />)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("rounded-lg")
      expect(card).toHaveClass("shadow-sm")
      expect(card).toHaveClass("bg-white")
    })

    it("applies custom className", () => {
      render(<Card data-testid="card" className="custom-class" />)
      expect(screen.getByTestId("card")).toHaveClass("custom-class")
    })
  })

  describe("Button", () => {
    it("renders button with text", () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
    })

    it("applies primary variant classes by default", () => {
      render(<Button>Primary</Button>)
      expect(screen.getByRole("button")).toHaveClass("bg-primary-500")
      expect(screen.getByRole("button")).toHaveClass("text-white")
    })

    it("applies outline variant classes", () => {
      render(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole("button")).toHaveClass("bg-white")
      expect(screen.getByRole("button")).toHaveClass("border")
    })

    it("applies secondary variant classes", () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole("button")).toHaveClass("bg-slate-100")
    })

    it("applies ghost variant classes", () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole("button")).toHaveClass("hover:bg-gray-100")
    })

    it("applies different sizes", () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole("button")).toHaveClass("h-8")

      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole("button")).toHaveClass("h-12")
    })

    it("can be disabled", () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole("button")).toBeDisabled()
    })
  })
})
