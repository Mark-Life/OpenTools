import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PRD_PATH = resolve(import.meta.dirname, "prd.json");

interface Story {
  acceptance: string[];
  attempts: number;
  depends: string[];
  id: string;
  passes: boolean;
  priority: number;
  title: string;
}

interface Prd {
  project: string;
  stories: Story[];
}

/** Read and parse prd.json */
function readPrd(): Prd {
  return JSON.parse(readFileSync(PRD_PATH, "utf-8"));
}

/** Write prd.json back */
function writePrd(prd: Prd) {
  writeFileSync(PRD_PATH, `${JSON.stringify(prd, null, 2)}\n`);
}

/** Check if all dependencies of a story are complete */
function depsComplete(story: Story, prd: Prd) {
  return story.depends.every((depId) => {
    const dep = prd.stories.find((s) => s.id === depId);
    return dep?.passes === true;
  });
}

/** Get next incomplete story (lowest priority, not skipped, deps met) */
function nextStory() {
  const prd = readPrd();
  const next = prd.stories
    .filter((s) => !s.passes && s.attempts !== -1 && depsComplete(s, prd))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!next) {
    console.log("NONE");
    process.exit(0);
  }
  console.log(next.id);
}

/** Get attempt count for a story */
function getAttempts(id: string) {
  const prd = readPrd();
  const story = prd.stories.find((s) => s.id === id);
  if (!story) {
    console.error(`Story ${id} not found`);
    process.exit(1);
  }
  console.log(story.attempts);
}

/** Increment attempt count for a story */
function incrementAttempts(id: string) {
  const prd = readPrd();
  const story = prd.stories.find((s) => s.id === id);
  if (!story) {
    console.error(`Story ${id} not found`);
    process.exit(1);
  }
  story.attempts += 1;
  writePrd(prd);
  console.log(story.attempts);
}

/** Mark story as skipped (attempts = -1) */
function markSkipped(id: string) {
  const prd = readPrd();
  const story = prd.stories.find((s) => s.id === id);
  if (!story) {
    console.error(`Story ${id} not found`);
    process.exit(1);
  }
  story.attempts = -1;
  writePrd(prd);
  console.log(`Skipped ${id}`);
}

// CLI dispatch
const [command, ...args] = process.argv.slice(2);

const requireArg = (arg: string | undefined): string => {
  if (!arg) {
    console.error("Missing story ID argument");
    process.exit(1);
  }
  return arg;
};

switch (command) {
  case "next-story":
    nextStory();
    break;
  case "get-attempts":
    getAttempts(requireArg(args[0]));
    break;
  case "increment-attempts":
    incrementAttempts(requireArg(args[0]));
    break;
  case "mark-skipped":
    markSkipped(requireArg(args[0]));
    break;
  default:
    console.error(
      "Usage: bun ralph/helpers.ts <next-story|get-attempts|increment-attempts|mark-skipped> [id]"
    );
    process.exit(1);
}
