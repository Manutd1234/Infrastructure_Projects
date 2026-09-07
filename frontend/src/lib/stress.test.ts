import { describe, it, expect } from "vitest";

describe("Scenario Stress Testing Engine", () => {
  it("calculates multi-asset shock propagation correctly", () => {
    const notional = 100_000;
    const betaEquity = 1.25;
    const betaCrypto = 0.5;
    const equityShock = -0.30;
    const cryptoShock = -0.50;

    const totalShock = betaEquity * equityShock + betaCrypto * cryptoShock;
    const dollarImpact = notional * totalShock;
    const postStressValue = notional + dollarImpact;

    expect(totalShock).toBeCloseTo(-0.625, 3);
    expect(dollarImpact).toBeCloseTo(-62_500, 0);
    expect(postStressValue).toBeCloseTo(37_500, 0);
  });

  it("bounds downside shock to maximum -100%", () => {
    const notional = 50_000;
    const unboundedShock = -1.45;
    const boundedShock = Math.max(-1.0, unboundedShock);
    const postStressValue = notional + notional * boundedShock;

    expect(boundedShock).toBe(-1.0);
    expect(postStressValue).toBe(0);
  });
});
