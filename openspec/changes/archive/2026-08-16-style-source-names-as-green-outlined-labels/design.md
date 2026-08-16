## Context

See proposal.md — Why.

The pieces this change touches already exist. `renderSourceNames` in `web/screener/render.js`
emits one `<span class="screener-source">` per reason inside a `<div class="screener-sources">`
wrapper, so there is already exactly one element per source name to draw a box around. In
`web/styles.css` the wrapper is a wrapping flexbox at `font-size: 10px` with `gap: 4px 6px` and
`color: var(--muted)`; `.screener-source` only sets `white-space: nowrap`. The mark green is the
literal `#4ac08a`, hardcoded in `.screener-mark` and reused by `.badge.ok`; there is no green
custom property in `:root`.

The row is a dense sidebar entry — symbol line, source line, instrument name, figures line — so the
outlines have to be added without pushing those lines apart noticeably.

## Goals / Non-Goals

**Goals:**

- Get the green-outlined label look from CSS alone, leaving `render.js` and its tests untouched.
- Keep the source line's vertical footprint close to what it is today.

**Non-Goals:**

- Introducing design tokens or a shared chip/label class for the rest of the UI. `.badge` already
  exists for a different purpose (freshness and compatibility, pill-shaped, in the same row) and is
  deliberately left alone.
- Any per-source differentiation, hover or click behavior on the labels.

## Decisions

**Style `.screener-source` in place rather than changing the markup.** The existing span per reason
is already the right granularity, so the whole change is a CSS rule: green text, a 1px green border,
`background: transparent`, and small padding so the border sits off the glyphs. Alternative
considered: emitting a nested wrapper element per label to allow independent text and box styling.
Rejected — nothing here needs two elements, and changing the markup would mean revisiting
`tests/js/run_render.mjs` for a purely visual change.

**Reuse the literal `#4ac08a` for both the text and the border.** The spec requires the labels to
read as the same signal as the marks, and that is the marks' exact green. Alternatives considered:
(a) the darker `#1f4733` that `.badge.ok` uses for its border — rejected because a barely visible
border reads as a faint box rather than the green rectangle asked for; (b) promoting the green to a
`:root` custom property first — rejected as a separate cleanup, since `.screener-mark` and
`.badge.ok` already hardcode it and this change should not be the one to migrate them.

**Drop `color: var(--muted)` inheritance for the labels only.** `.screener-sources` keeps its muted
colour declaration so nothing else inside it changes, and `.screener-source` overrides the colour.
This keeps the labels distinguishable from the range, position and state text, which stay muted.

**Square-ish corners with a 2–3px radius, not a pill.** The request asks for rectangles, and the
pill shape is already spoken for by `.badge`. A hair of radius matches the rest of the UI, which
rounds every bordered surface (`6px` on inputs and buttons, `8px` on rows), without reading as
rounded at 10px type. Recorded as an assumption rather than a requirement — the spec asks only for a
rectangular outline.

**Widen the wrapper's gap and keep its wrapping as-is.** With borders drawn, the current `4px 6px`
gap is the distance between outlines rather than between words, so it needs to grow enough that no
two labels touch on either axis. The flex wrapping itself is unchanged; each label keeps its own
complete outline when the line wraps because each is a separate bordered element.

**Absorb the label padding into the line's existing spacing.** The border and padding add a few
pixels of height per label. Trim `.screener-sources`'s `margin-top` and, if needed, its
`line-height` so the source line's total height stays close to today's, rather than letting the row
grow and reduce how many instruments fit on screen.

## Risks / Trade-offs

- **The row grows taller and fewer instruments fit in the sidebar** → Keep the padding minimal
  (roughly 1px vertical, 4px horizontal) and reclaim it from the wrapper's existing top margin and
  line-height; verify against a row with a wrapped source line, which is the worst case.
- **Green labels compete with the green marks for attention** → Only the text and a 1px border are
  green and the fill stays transparent, so the labels stay lighter-weight than the solid dots; the
  marks remain the strength signal.
- **A row with many sources becomes a wall of boxes** → Sources are bounded by the number of scoring
  rules, and the spec already requires each label to stay separate, so the failure mode is visual
  density rather than ambiguity. Review a maximum-sources row before calling the change done.
- **Verification is visual, and the Node tests cannot see it** → `tests/js/run_render.mjs` can only
  confirm the markup is unchanged. The outline, the transparent fill and the spacing have to be
  checked in the browser against rows with zero, one, a few and a wrapping number of sources.
