// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

afterEach(cleanup);

function Boom(): never {
  throw new Error("krasj");
}

describe("ErrorBoundary (F4)", () => {
  it("viser barn når alt er bra", () => {
    render(
      <ErrorBoundary>
        <p>Innhold</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Innhold")).toBeTruthy();
  });

  it("viser vennlig feilskjerm når et barn kaster", () => {
    // Demp React/console-støy for den forventede feilen.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Last på nytt")).toBeTruthy();
    spy.mockRestore();
  });
});
