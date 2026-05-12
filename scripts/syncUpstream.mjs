/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./checkNodeVersion.js";

import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const UPSTREAM_URL = "https://github.com/Vendicated/Vencord.git";
const UPSTREAM_REMOTE = "upstream";

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function capture(cmd) {
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
}

// Ensure git is available
try {
    execSync("git --version", { stdio: "ignore" });
} catch {
    console.error("ERROR: git is not installed or not in PATH.");
    process.exit(1);
}

// Ensure this is a git repository
try {
    execSync("git rev-parse --git-dir", { cwd: ROOT, stdio: "ignore" });
} catch {
    console.error("ERROR: This directory is not a git repository. Cannot sync upstream.");
    process.exit(1);
}

// Warn about uncommitted changes (but don't abort — user may have intentional WIP)
const dirty = capture("git status --porcelain");
if (dirty) {
    console.warn(
        "\nWARNING: You have uncommitted local changes. They may conflict with upstream changes.\n" +
        "Consider committing or stashing them first (git stash) if the merge fails.\n"
    );
}

// Set up / verify the upstream remote
const remoteList = capture("git remote").split("\n");

if (!remoteList.includes(UPSTREAM_REMOTE)) {
    console.log(`Adding '${UPSTREAM_REMOTE}' remote → ${UPSTREAM_URL}`);
    run(`git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
} else {
    const existingUrl = capture(`git remote get-url ${UPSTREAM_REMOTE}`);
    if (existingUrl !== UPSTREAM_URL) {
        console.log(`Updating '${UPSTREAM_REMOTE}' remote URL → ${UPSTREAM_URL}`);
        run(`git remote set-url ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`);
    }
}

// Fetch latest commits from upstream
console.log("\nFetching latest commits from upstream Vencord...");
run(`git fetch ${UPSTREAM_REMOTE}`);

// Determine the upstream default branch (main or master)
let upstreamBranch = "main";
try {
    // git will set HEAD automatically after first fetch if remote has default branch info
    const symref = capture(`git symbolic-ref refs/remotes/${UPSTREAM_REMOTE}/HEAD`);
    upstreamBranch = symref.replace(`refs/remotes/${UPSTREAM_REMOTE}/`, "");
} catch {
    // Fallback: check which ref exists
    try {
        capture(`git show-ref --verify refs/remotes/${UPSTREAM_REMOTE}/main`);
        upstreamBranch = "main";
    } catch {
        upstreamBranch = "master";
    }
}

// Merge upstream into the current branch
console.log(`\nMerging ${UPSTREAM_REMOTE}/${upstreamBranch} into your current branch...`);
try {
    run(`git merge ${UPSTREAM_REMOTE}/${upstreamBranch} --no-edit`);
} catch {
    console.error(`
ERROR: Merge failed — there are conflicts between your changes and upstream.

To resolve:
  1. Run:  git status           (see which files conflict)
  2. Edit the conflicting files and fix the conflict markers
  3. Run:  git add <file>       (for each resolved file)
  4. Run:  git commit
  5. Run:  pnpm install         (to update dependencies)

Your custom plugins in src/userplugins/ are SAFE — git never touches gitignored files.
`);
    process.exit(1);
}

// Reinstall / update dependencies to match the new lockfile / package.json
console.log("\nUpdating dependencies...");
run("pnpm install");

console.log(`
Done! Vencord has been updated to the latest upstream version.
Your custom plugins in src/userplugins/ were NOT modified.

Run  pnpm build  to rebuild with the new changes.
`);
