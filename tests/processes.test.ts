import { describe, expect, it } from "vitest";
import {
  selectProjectNodeProcesses,
  selfAndAncestors,
  type ProcessInfo,
} from "../scripts/lib/processes";

const ROOT = "C:\\projets\\choofauto";

const p = (pid: number, parentPid: number, name: string, command: string): ProcessInfo => ({
  pid,
  parentPid,
  name,
  command,
});

const ALL: ProcessInfo[] = [
  p(1, 0, "WindowsTerminal.exe", "wt.exe"),
  p(2, 1, "powershell.exe", "powershell.exe"),
  p(3, 2, "pnpm.exe", "pnpm.exe dev"),
  p(4, 3, "cmd.exe", "cmd.exe /d /s /c prisma generate && next dev"),
  p(
    5,
    4,
    "node.exe",
    'node "C:\\projets\\choofauto\\node_modules\\.bin\\..\\next\\dist\\bin\\next" dev',
  ),
  p(
    6,
    5,
    "node.exe",
    "node.exe C:\\projets\\choofauto\\node_modules\\next\\dist\\server\\lib\\start-server.js",
  ),
  p(7, 2, "node.exe", "node C:/projets/choofauto/node_modules/prisma/build/index.js studio"),
  p(8, 2, "claude.exe", "claude --cwd C:\\projets\\choofauto"),
  p(
    9,
    2,
    "node.exe",
    "node C:\\Users\\x\\node_modules\\@anthropic-ai\\claude-code\\cli.js C:\\projets\\choofauto\\",
  ),
  p(10, 2, "node.exe", "node C:\\projets\\choofauto-donnees\\outil.js"),
  p(11, 2, "node.exe", "node C:\\projets\\autre-projet\\node_modules\\next\\dist\\bin\\next dev"),
  p(12, 2, "bash.exe", "bash -c 'cd /c/projets/choofauto/ && ls'"),
  p(20, 2, "pnpm.exe", "pnpm.exe stop"),
  p(
    21,
    20,
    "node.exe",
    "node C:\\projets\\choofauto\\node_modules\\tsx\\dist\\cli.mjs scripts/stop.ts",
  ),
  p(
    22,
    21,
    "node.exe",
    "node --import C:\\projets\\choofauto\\node_modules\\tsx\\dist\\loader.mjs scripts/stop.ts",
  ),
];

describe("programmes Node de choofauto", () => {
  it("retient l'application et Prisma Studio, quelle que soit l'écriture du chemin", () => {
    const found = selectProjectNodeProcesses(ALL, ROOT, selfAndAncestors(ALL, 22));
    expect(found.map((x) => x.pid)).toEqual([5, 6, 7]);
  });

  it("n'arrête jamais Claude Code, un autre projet, un dossier voisin ni un autre programme", () => {
    const found = selectProjectNodeProcesses(ALL, ROOT, new Set()).map((x) => x.pid);
    for (const pid of [8, 9, 10, 11, 12]) expect(found).not.toContain(pid);
  });

  it("n'arrête jamais pnpm stop lui-même ni ses parents", () => {
    const self = selfAndAncestors(ALL, 22);
    expect([...self].sort((a, b) => a - b)).toEqual([1, 2, 20, 21, 22]);
    const found = selectProjectNodeProcesses(ALL, ROOT, self).map((x) => x.pid);
    expect(found).not.toContain(21);
    expect(found).not.toContain(22);
  });
});
