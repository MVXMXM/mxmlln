---
name: concentric-corners
description: Compute border-radius for nested/concentric rounded rectangles so their corners stay parallel (constant gap around the curve). Use when nesting rounded cards, rings, badges, insets, or any rounded box inside another rounded box, or when nested corners look "pinched" or off at the rounded parts.
---

# Concentric corners

When one rounded rectangle nests inside another and they share the **same** `border-radius`, the corners look wrong: the gap between the two strokes is uniform along the straight edges but **pinches** at the rounded corners. The fix is a single rule.

## The rule

> **Outer radius = inner radius + gap**

where `gap` is the offset between the two **outer border edges** (i.e. how far the inner box's edge sits inside the outer box's edge, measured perpendicular to the edge).

```
R_outer = R_inner + gap
```

Build outward from the **innermost** box as the base: pick its radius once, then each successively outer layer adds that layer's gap.

```
R_0 = base                       (innermost — choose by eye)
R_1 = R_0 + gap_0_to_1
R_2 = R_1 + gap_1_to_2
...
```

## Why it works

A rounded corner is a quarter-circle arc. Its center of curvature sits `R` in from the corner along each axis — at `(R, R)` from the box's corner. Two arcs are **concentric** (parallel, constant gap) only when they share that center.

- Outer arc center: `(R_outer, R_outer)` from the outer corner.
- Inner arc center: `(gap + R_inner, gap + R_inner)` from the same outer corner (the inner box starts `gap` in on both axes).

Set them equal → `R_outer = R_inner + gap`. Any other outer radius moves the center, so the two arcs diverge and the corner gap pinches or bulges.

## The catch: the gap must be equal on the axes that meet at the corner

The derivation assumes the inner box is inset by the **same** `gap` horizontally and vertically. So for a corner to be truly concentric, the inset must match on both sides forming that corner.

- **Uniform inset all around** (inner box centered with equal padding on all four sides) → all four corners concentric. Use one `gap`.
- **Asymmetric inset** (e.g. nested on the left, extending right to hold more content) → only the corners where the two insets are equal will read as concentric. Make the insets you care about (usually the tight "nesting" side) equal, and size the radius to that gap. The far corners are visually distant and don't need it.

Common gap sources, in CSS:
- The inner box is a child offset by the parent's `padding` → `gap = padding + parent_border_width` (border-radius is measured to the outer border edge).
- The inner box is absolutely positioned at `inset: g` → `gap = g`.

So make padding uniform on the nesting sides, then `gap = padding + border`.

## CSS pattern

Three nested rings, innermost as base, uniform `34px` padding and `1px` borders → `gap = 35`:

```css
.ring { border: 1px solid; padding: 34px; }     /* gap = 34 + 1 = 35 */

.ring.layer-0 { border-radius: 20px; }           /* base */
.ring.layer-1 { border-radius: 55px; }           /* 20 + 35 */
.ring.layer-2 { border-radius: 90px; }           /* 55 + 35 */
```

For vertical concentricity when using flex `align-items: center`, the nested child must be the **tallest** item in its parent so it sits flush against the top and bottom padding (inset = padding on both). If a shorter sibling were tallest, the child would float centered and its top/bottom gap would no longer equal the padding.

## Verify

1. Render and eyeball a corner: the gap between the two strokes should stay constant from the straight edge through the 45° point of the curve — no pinch.
2. Or check the math: each outer radius should differ from its inner by exactly the gap.
3. With a browser, assert the centers coincide. For a top-left corner of a child inside a parent:

```js
// gap should equal (outerRadius - innerRadius)
const gap = childRect.left - parentRect.left;          // when child is flush-left in parent padding
const dR  = parseFloat(getComputedStyle(parent).borderTopLeftRadius)
          - parseFloat(getComputedStyle(child).borderTopLeftRadius);
// concentric when  gap ≈ dR
```

## Notes

- If the resulting outer radius feels too round, reduce the **gap** (tighter padding) or the **base** radius — don't break the `+gap` relationship, or you lose concentricity.
- Per-corner radii (e.g. `border-radius: 47px 47px 54px 41px`) follow the same rule per corner: add the same `gap` to each of the four values.
- The rule is identical for `clip-path`, SVG `rx`, and figure insets — it's geometry, not a CSS quirk.
