#!/usr/bin/env nu
# game.nu — small Nushell launcher for RogueD4X local iteration.

let mode = ($env.D4X_MODE? | default "dev")

if $mode == "test" {
  npm test
} else if $mode == "build" {
  npm run build
} else {
  npm run dev
}
