import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

// Simple UI test checking initial step
describe("Home Page Initial State", () => {
  it("renders upload CSV zone initially", () => {
    render(<Home />);
    
    // Check that we render the stepper title (desktop and mobile instances)
    expect(screen.getAllByText("Upload CSV").length).toBeGreaterThan(0);
    
    // Check that the Drag and Drop zone is in place
    expect(screen.getByText("Upload your raw CSV")).toBeDefined();
  });
});
