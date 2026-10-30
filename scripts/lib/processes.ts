// Programmes Node de choofauto encore en marche (application, Prisma Studio, scripts), pour les
// signaler avant une migration et les arrêter avec pnpm stop. Jamais Claude Code ni un autre projet.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export type ProcessInfo = { pid: number; parentPid: number; name: string; command: string };

// Tous les processus de la machine, avec leur parent et leur ligne de commande.
export function listProcesses(): ProcessInfo[] {
  if (process.platform === "win32") {
    const script =
      "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress";
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const rows = JSON.parse(out) as {
      ProcessId: number;
      ParentProcessId: number;
      Name: string;
      CommandLine: string | null;
    }[];
    return rows.map((r) => ({
      pid: r.ProcessId,
      parentPid: r.ParentProcessId,
      name: r.Name,
      command: r.CommandLine ?? "",
    }));
  }
  const out = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,args="], { encoding: "utf8" });
  return out
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ pid: Number(m[1]), parentPid: Number(m[2]), name: m[3]!, command: m[4]! }));
}

// Le processus courant et ses ancêtres (pnpm, shell…) : jamais arrêtés ni signalés.
export function selfAndAncestors(all: ProcessInfo[], pid: number = process.pid): Set<number> {
  const byPid = new Map(all.map((p) => [p.pid, p]));
  const out = new Set<number>();
  for (let current = byPid.get(pid); current && !out.has(current.pid);) {
    out.add(current.pid);
    current = byPid.get(current.parentPid);
  }
  out.add(pid);
  return out;
}

const normalize = (text: string) => text.replaceAll("/", "\\").toLowerCase();

// Programmes Node dont la ligne de commande vise un fichier du projet (dossier racine suivi d'un
// séparateur : C:\projets\choofauto-donnees n'est pas visé). Claude Code et le processus courant exclus.
export function selectProjectNodeProcesses(
  all: ProcessInfo[],
  projectRoot: string,
  excluded: Set<number>,
): ProcessInfo[] {
  const root = normalize(resolve(projectRoot)).replace(/\\$/, "") + "\\";
  return all.filter((p) => {
    const name = p.name.toLowerCase();
    if (name !== "node.exe" && name !== "node") return false;
    if (excluded.has(p.pid)) return false;
    const command = normalize(p.command);
    if (command.includes("claude-code") || command.includes("@anthropic-ai")) return false;
    return command.includes(root);
  });
}

export function findProjectNodeProcesses(projectRoot: string = process.cwd()): ProcessInfo[] {
  const all = listProcesses();
  return selectProjectNodeProcesses(all, projectRoot, selfAndAncestors(all));
}

// Une ligne par programme : numéro et commande, raccourcie.
export function describeProcess(p: ProcessInfo): string {
  const command = p.command.replace(/\s+/g, " ").trim();
  return `  ${p.pid}  ${command.length > 140 ? `${command.slice(0, 137)}...` : command}`;
}
