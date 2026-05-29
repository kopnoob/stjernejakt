// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";

afterEach(cleanup);

describe("Modal (H1 a11y)", () => {
  it("har role=dialog og aria-modal", () => {
    render(
      <Modal onClose={() => {}} labelledBy="t">
        <h2 id="t">Tittel</h2>
        <button>Ok</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("t");
  });

  it("flytter fokus til første knapp ved åpning", () => {
    render(
      <Modal onClose={() => {}}>
        <button>Først</button>
        <button>Andre</button>
      </Modal>,
    );
    expect(document.activeElement?.textContent).toBe("Først");
  });

  it("Esc lukker dialogen", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <button>Ok</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("klikk på bakteppet lukker, klikk inni gjør ikke", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <button>Inni</button>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Inni"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector(".sheet-backdrop")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Tab fra siste fokuserbare går tilbake til første (trap)", () => {
    render(
      <Modal onClose={() => {}}>
        <button>A</button>
        <button>B</button>
      </Modal>,
    );
    const b = screen.getByText("B");
    b.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.textContent).toBe("A");
  });
});
