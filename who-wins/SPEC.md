# Who Wins? — Product Spec

A web app for friends to debate "who would win" matchups. Two modes: **Team vs Team** (two players draft one character per category) and **Bracket** (single-elimination tournament on one topic). Every fight gets random **conditions** rolled (location, weapons, etc.) to shape the debate. Users decide winners manually.

## Tech (current prototype)
- Single self-contained HTML file, vanilla JS, no framework.
- State saved to `localStorage` key `debate-bracket-v1` (per browser only, not shared).
- Fonts: Big Shoulders Display (headings), Barlow (body), JetBrains Mono (labels/numbers).
- Light + dark theme via CSS tokens. Mobile-first, works at 400px.
- Respects `prefers-reduced-motion`.

## Layout
1. **Header**: "WHO WINS?" title (WINS in accent red). Right side shows "Player1 vs Player2" (team mode) or bracket topic.
2. **Mode tabs**: `Team vs Team` (default) | `Bracket`.
3. **Two collapsible panels side by side** (stack on mobile):
   - Left: setup for the active mode.
   - Right: **Roll Table** (shared by both modes).
4. **Results area** for the active mode.
5. **Fight screen** overlay (full screen) when a roll happens.

---

## Roll Table (conditions)
Each category has: on/off checkbox, name, comma-separated options (editable). "Restore defaults" button.

| Category | Default on | Options |
|---|---|---|
| Location | yes | City streets, Colosseum arena, Jungle, Open water, Desert, Arctic tundra, Space station, Haunted mansion, Abandoned mall, Skyscraper rooftop, Subway tunnels, Volcano rim, Fighter 1's home turf, Fighter 2's home turf |
| Weapons | yes | None (hands only), Firearms, Bows, Melee, Signature gear, Random weapon pile, Swapped gear, Improvised only, Aura battle |
| Size | yes | 1v1, With followers, 1v1 then backup at 5 min |
| Time | yes | Broad daylight, Night, Thick fog, Thunderstorm, Blizzard |
| Prep | yes | None (bloodlusted), 1 hour, 1 day, 1 week, Unlimited |
| Win by | yes | To the death, Knockout, Ring out, Outsmart them, First blood, Capture the flag, Survive 10 min |
| Intel | no | Both know everything, Neither knows the other, Only Fighter 1 knows, Only Fighter 2 knows |
| Version | no | Peak form, Start of their story, End of their story, Random era |
| Wildcard | no | Nothing, Nothing, Nothing, Half gravity, Zombie horde, Must stay silent, Crowd can intervene, Rising water, Teammate betrays, Random power swap |

Rules:
- Roll = pick one random option per enabled category.
- Text "Fighter 1" / "Fighter 2" in an option is replaced with the actual character names.
- Repeating an option weights it (Wildcard "Nothing" x3 = mostly nothing).
- No 3v3 anywhere.

---

## Team vs Team mode
**Setup panel**
- Player 1 name, Player 2 name.
- Categories textarea (one per line). Defaults:
  Movie Monsters, Cartoon Dads, Magic Users, Characters Played by Keanu Reeves, Detectives, Horror Slashers, Jedi (No Sith), Pixar Characters, Live Action Sitcom Characters, Chosen Ones, Sidekicks, Reality TV Stars, Tank (Marvel or DC only)
- Two "dump" textareas side by side, one per player: picks one per line, matched to categories by line number. Blank line = no pick yet.
- Buttons: **Set matchups**, **Clear winners**, **Reroll every fight**.
- Checkbox (shared): Auto-roll every fight.

**Results**
- Scoreboard: P1 name, "X – Y", P2 name. Leader highlighted in accent. Subline: "N fights left" or "All fights called".
- Grid of cards, one per category:
  - Header: category name + number (01, 02…).
  - Two rows: character name + owner tag. Tap to award the point (tap again to undo). Winner green with "WIN", loser struck through and grey.
  - Condition chips. Tap one chip to reroll just that condition.
  - Button: "Roll conditions" / "Reroll all" → opens Fight screen.
- Changing picks keeps existing winners/rolls only if both names in that row are unchanged.

---

## Bracket mode
**Setup panel**
- Topic name, characters textarea (one per line).
- Checkboxes: Shuffle seeding, Auto-roll every fight.
- Buttons: **Build bracket**, **Clear results**.

**Logic**
- Pad to next power of 2 with BYEs. Seed i plays seed (size-1-i), so top seeds get the BYEs.
- BYE matches auto-advance.
- Tap a name to advance; winner flows to next round. Changing a result clears downstream slots.
- Round labels: Round N, Quarterfinals, Semifinals, Final, then Champion box.
- Rounds are horizontal columns (290px each), scroll sideways on mobile.
- Each match card: same chips + roll button as team mode.

---

## Fight screen (roll animation)
Opens full-screen whenever a fight is rolled from its card.
1. Top bar: category/topic title + Close button (Esc also closes).
2. **Two squares side by side** with "VS" between:
   - Left square: accent red. Right square: ink color.
   - Big initials (1–2 letters) + full name below.
   - Squares slide in from left/right (~450ms), then "VS" stamps in (scale 2.4 → 1).
3. **Stats list** under the squares, one row per condition (label left, value right).
   - Each row starts at "?", then slot-machine spins through random options (~55ms ticks for 650ms), then lands on the real result.
   - Rows reveal staggered: first at 700ms, then +380ms each.
4. Buttons: **Reroll** (re-rolls and replays the animation).
5. Tap a square to crown the winner: winner gets a green ring, loser fades to 35%. Updates the card/scoreboard behind it.
6. Reduced motion: no slides or spins, results show instantly.

---

## Data model
```js
S = {
  mode: "team" | "bracket",
  cats: [{ key, on, opts /* comma string */ }],
  team: {
    pA, pB,
    cats: [string],
    a: [string], b: [string],          // picks by line
    m: [{ a, b, w: "a"|"b"|null, conds: { [key]: value } }]
  },
  topic, fighters: [string], example: bool,
  rounds: [[{ a, b, w: name|null, conds }]]
}
```
The build also stores `auto`, `shuffle` and `seeds` (seed order, for the #N tags), and BYE matches carry `bye: true`.

## Next ideas (not built)
- Shared online state so everyone sees the same bracket (needs a backend, e.g. Supabase/Firebase).
- Group voting per fight instead of one person deciding.
- Character images in the squares.
- Share/export results image.
