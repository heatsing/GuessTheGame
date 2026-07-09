import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TimelineControls,
  type TimelineItem,
} from "@/components/game/TimelineControls";

const items: TimelineItem[] = [
  { id: "a", title: "Printing Press" },
  { id: "b", title: "Steam Engine" },
  { id: "c", title: "Airplane" },
];

describe("TimelineControls (non-drag path)", () => {
  it("renders all items with position numbers", () => {
    render(<TimelineControls items={items} onReorder={() => {}} />);
    expect(screen.getByText("Printing Press")).toBeInTheDocument();
    expect(screen.getByText("Steam Engine")).toBeInTheDocument();
    expect(screen.getByText("Airplane")).toBeInTheDocument();
    // Position badges 1..3
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("Move down button moves an item later in the order", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<TimelineControls items={items} onReorder={onReorder} />);

    await user.click(screen.getByRole("button", { name: /Move Printing Press down/i }));

    expect(onReorder).toHaveBeenCalledTimes(1);
    const next = (onReorder.mock.calls[0]?.[0] ?? []) as TimelineItem[];
    expect(next.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("Move up button moves an item earlier", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<TimelineControls items={items} onReorder={onReorder} />);

    await user.click(screen.getByRole("button", { name: /Move Airplane up/i }));

    const next = (onReorder.mock.calls[0]?.[0] ?? []) as TimelineItem[];
    expect(next.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("disables Move up on the first item and Move down on the last", () => {
    render(<TimelineControls items={items} onReorder={() => {}} />);
    expect(screen.getByRole("button", { name: /Move Printing Press up/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Move Airplane down/i })).toBeDisabled();
  });

  it("reorders via keyboard Arrow Down on a focused list item", async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    render(<TimelineControls items={items} onReorder={onReorder} />);

    const firstItem = screen.getByText("Printing Press").closest("li");
    firstItem?.focus();
    await user.keyboard("{ArrowDown}");

    expect(onReorder).toHaveBeenCalledTimes(1);
    const next = (onReorder.mock.calls[0]?.[0] ?? []) as TimelineItem[];
    expect(next.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("announces position via aria-label", () => {
    render(<TimelineControls items={items} onReorder={() => {}} />);
    expect(screen.getByLabelText(/Position 1 of 3: Printing Press/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Position 3 of 3: Airplane/i)).toBeInTheDocument();
  });

  it("exposes an instruction for screen readers", () => {
    render(<TimelineControls items={items} onReorder={() => {}} />);
    expect(
      screen.getByText(/Arrange the items oldest to newest/i),
    ).toBeInTheDocument();
  });
});
