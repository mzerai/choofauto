import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MODULES = ["catalog", "observations", "partners", "ops", "rules", "analytics"];

describe("arborescence", () => {
  it.each(MODULES)("le module %s expose un index.ts", (name) => {
    expect(existsSync(`src/modules/${name}/index.ts`)).toBe(true);
  });

  it("ne trouve pas un module inexistant", () => {
    expect(existsSync("src/modules/inexistant/index.ts")).toBe(false);
  });
});
