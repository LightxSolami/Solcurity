import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PumpFunCreatorMonitor } from "@/components/pumpfuntool/PumpFunCreatorMonitor";

describe("PumpFunCreatorMonitor liquidity", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
    else Reflect.deleteProperty(global, "fetch");
  });

  it("shows market liquidity in USD when the pool is not quoted in SOL", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        analytics: {
          token: {
            mint: "11111111111111111111111111111111",
            name: "Example Token",
            symbol: "EX",
            creator: "",
            complete: true,
          },
          liquidity: { sol: 0, tokens: 1200, usd: 24_000 },
          bondingCurve: { available: false, progress: null },
          recentTrades: [],
        },
      }),
    } as Response);

    render(<PumpFunCreatorMonitor />);
    fireEvent.change(screen.getByLabelText("Pump.fun token mint address"), {
      target: { value: "11111111111111111111111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find creator" }));

    await waitFor(() => {
      expect(screen.getByText("$24,000 USD")).toBeInTheDocument();
    });
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });
});
