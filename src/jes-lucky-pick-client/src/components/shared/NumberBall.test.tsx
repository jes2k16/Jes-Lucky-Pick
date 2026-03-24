import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NumberBall } from "./NumberBall";

describe("NumberBall", () => {
  it("renders the number", () => {
    render(<NumberBall number={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("applies red color for numbers 1-10", () => {
    const { container } = render(<NumberBall number={5} />);
    expect(container.firstChild).toHaveClass("bg-red-700");
  });

  it("applies orange color for numbers 11-20", () => {
    const { container } = render(<NumberBall number={15} />);
    expect(container.firstChild).toHaveClass("bg-orange-700");
  });

  it("applies green color for numbers 21-30", () => {
    const { container } = render(<NumberBall number={25} />);
    expect(container.firstChild).toHaveClass("bg-green-700");
  });

  it("applies blue color for numbers 31-42", () => {
    const { container } = render(<NumberBall number={35} />);
    expect(container.firstChild).toHaveClass("bg-blue-700");
  });

  it("applies small size classes", () => {
    const { container } = render(<NumberBall number={1} size="sm" />);
    expect(container.firstChild).toHaveClass("h-8", "w-8");
  });

  it("applies medium size classes by default", () => {
    const { container } = render(<NumberBall number={1} />);
    expect(container.firstChild).toHaveClass("h-10", "w-10");
  });

  it("applies large size classes", () => {
    const { container } = render(<NumberBall number={1} size="lg" />);
    expect(container.firstChild).toHaveClass("h-14", "w-14");
  });

  it("applies boundary color correctly for number 10", () => {
    const { container } = render(<NumberBall number={10} />);
    expect(container.firstChild).toHaveClass("bg-red-700");
  });

  it("applies boundary color correctly for number 11", () => {
    const { container } = render(<NumberBall number={11} />);
    expect(container.firstChild).toHaveClass("bg-orange-700");
  });

  it("applies boundary color correctly for number 42", () => {
    const { container } = render(<NumberBall number={42} />);
    expect(container.firstChild).toHaveClass("bg-blue-700");
  });
});
