import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders children and responds to clicks", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and unclickable while loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button onClick={onClick} isLoading>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an explicit disabled prop", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
