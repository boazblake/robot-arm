import { describe, expect, it } from "vitest";
import { getRoutePrefix } from "./routePrefix";

describe("getRoutePrefix", () => {
  it("maps root base URL to empty route prefix", () => {
    expect(getRoutePrefix("/")).toBe("");
  });

  it("removes trailing slash from Pages base URL", () => {
    expect(getRoutePrefix("/lift-mate/")).toBe("/lift-mate");
  });

  it("preserves base URL without trailing slash", () => {
    expect(getRoutePrefix("/lift-mate")).toBe("/lift-mate");
  });
});
