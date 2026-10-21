// Kiểm tra ranh giới kiến trúc (CLAUDE.md, "Quy tắc tách module"): nền tảng không biết từng game,
// game không biết game khác. Khi có hàng trăm game, các quy tắc này giữ cho mỗi game là một thư mục độc lập.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PACKAGES = dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === "dist") return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const rel = (file: string): string => relative(PACKAGES, file).split(sep).join("/");
const isTest = (file: string): boolean => /\.test\.ts$/.test(file);
const read = (file: string): string => readFileSync(file, "utf8");

/** Thư mục game: trong packages/engine và packages/client, thư mục nào có rules.ts (engine) hoặc client-game.ts (client) */
const ENGINE_GAMES = readdirSync(join(PACKAGES, "engine")).filter(
  (n) =>
    statSync(join(PACKAGES, "engine", n)).isDirectory() &&
    listFiles(join(PACKAGES, "engine", n)).some((f) => f.endsWith("rules.ts")),
);
const CLIENT_GAMES = readdirSync(join(PACKAGES, "client")).filter((n) => {
  const dir = join(PACKAGES, "client", n);
  return statSync(dir).isDirectory() && listFiles(dir).some((f) => f.endsWith("client-game.ts"));
});

/** Các import tương đối và import từ @playtogether/engine/<game> trong một file */
function importsOf(file: string): string[] {
  const out: string[] = [];
  for (const m of read(file).matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) out.push(m[1] ?? "");
  return out;
}

/** Game mà import này trỏ tới: theo đường dẫn tương đối hoặc theo @playtogether/engine/<game> */
function gameOfImport(from: string, spec: string, games: string[], layer: "client" | "engine"): string | null {
  const viaPackage = /^@playtogether\/engine\/([\w-]+)/.exec(spec);
  if (viaPackage && games.includes(viaPackage[1] ?? "") && layer === "engine") return viaPackage[1] ?? null;
  if (!spec.startsWith(".")) return null;
  const target = rel(resolve(dirname(from), spec));
  const m = new RegExp(`^${layer}/([\\w-]+)(?:/|$)`).exec(target);
  return m && games.includes(m[1] ?? "") ? (m[1] ?? null) : null;
}

function ownerOf(file: string, games: string[], layer: "client" | "engine"): string | null {
  const m = new RegExp(`^${layer}/([\\w-]+)/`).exec(rel(file));
  return m && games.includes(m[1] ?? "") ? (m[1] ?? null) : null;
}

describe("kiến trúc: tách nền tảng và từng game", () => {
  it("có nhận ra các game (kiểm tra chính bộ kiểm tra này)", () => {
    expect(CLIENT_GAMES.sort()).toEqual(expect.arrayContaining(["caro", "o-an-quan"]));
    expect(ENGINE_GAMES.sort()).toEqual(expect.arrayContaining(["caro", "o-an-quan"]));
  });

  it("client: game không import game khác", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "client")).filter((f) => f.endsWith(".ts"))) {
      const owner = ownerOf(file, CLIENT_GAMES, "client");
      if (!owner) continue;
      for (const spec of importsOf(file)) {
        const target = gameOfImport(file, spec, CLIENT_GAMES, "client");
        if (target && target !== owner) bad.push(`${rel(file)} → ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("client: nền tảng chỉ import thư mục game trong games/registry.ts", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "client")).filter((f) => f.endsWith(".ts") && !isTest(f))) {
      if (ownerOf(file, CLIENT_GAMES, "client") || rel(file) === "client/games/registry.ts") continue;
      for (const spec of importsOf(file)) {
        if (gameOfImport(file, spec, CLIENT_GAMES, "client")) bad.push(`${rel(file)} → ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("client: nền tảng không nhắc tên game (chuỗi 'o-an-quan', 'caro') ngoài registry", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "client")).filter((f) => f.endsWith(".ts") && !isTest(f))) {
      if (ownerOf(file, CLIENT_GAMES, "client") || rel(file) === "client/games/registry.ts") continue;
      if (/["'`](o-an-quan|caro)["'`]/.test(read(file))) bad.push(rel(file));
    }
    expect(bad).toEqual([]);
  });

  it("engine: game không import game khác; phần dùng chung không import game", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "engine")).filter((f) => f.endsWith(".ts"))) {
      const owner = ownerOf(file, ENGINE_GAMES, "engine");
      for (const spec of importsOf(file)) {
        const target = gameOfImport(file, spec, ENGINE_GAMES, "engine");
        if (target && target !== owner) bad.push(`${rel(file)} → ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("engine: là hàm thuần (không Math.random, không Date.now, không import Node/DOM)", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "engine")).filter((f) => f.endsWith(".ts") && !isTest(f))) {
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      if (/Math\.random|Date\.now|new Date\(|from\s+["']node:/.test(code)) bad.push(rel(file));
    }
    expect(bad).toEqual([]);
  });

  it("server: chỉ room-manager.ts (nơi đăng ký game) được import module engine của từng game", () => {
    const bad: string[] = [];
    for (const file of listFiles(join(PACKAGES, "server")).filter((f) => f.endsWith(".ts") && !isTest(f))) {
      if (rel(file) === "server/room-manager.ts") continue;
      for (const spec of importsOf(file)) {
        if (/^@playtogether\/engine\/[\w-]+/.test(spec)) bad.push(`${rel(file)} → ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
