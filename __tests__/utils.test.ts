import { describe, it, expect } from "vitest";
import { isoWeekKey, capWaterMl } from "../lib/utils";

describe("utils", () => {
  it("caps water at 3000 ml", () => {
    expect(capWaterMl(0)).toBe(0);
    expect(capWaterMl(2900)).toBe(2900);
    expect(capWaterMl(3000)).toBe(3000);
    expect(capWaterMl(4500)).toBe(3000);
    expect(capWaterMl(-100)).toBe(0);
  });

  it("computes a stable ISO week key", () => {
    // 2025-08-14 and 2025-08-15 should be the same ISO week
    const a = isoWeekKey("2025-08-14");
    const b = isoWeekKey("2025-08-15");
    expect(a).toBe(b);
  });
});