# MaxOS

MaxOS is the React component package for the portfolio’s `/system` design system. Import each component from `@mvxmxm/maxos` and load its matching stylesheet.

```tsx
import { SegmentedController } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/segmented-controller.css';
```

Pass an accessible `label`, an `items` array of `{ id, label }` objects, the selected `value`, and an `onChange` callback. The app supplies React and owns the selected value. The stylesheet includes default colors and uses Inter when available. For a shadow DOM consumer such as ELIX, include the stylesheet inside the shadow root.

| Component | Use it for | Stylesheet |
| --- | --- | --- |
| `SegmentedController` | Selecting one option from a group | `@mvxmxm/maxos/segmented-controller.css` |
| `SliderScale` | A scrolling ruler with optional fractional stops | `@mvxmxm/maxos/slider-scale.css` |
| `SliderGeneral` | A 0–100 control with relative dragging & a percentage readout | `@mvxmxm/maxos/slider-general.css` |
| `Switch` | A controlled on/off toggle, or `variant="cycle"` for labeled option cycling | `@mvxmxm/maxos/switch.css` |
| `Kbd` | An inline key or shortcut, such as `<Kbd>control + shift + M</Kbd>` | `@mvxmxm/maxos/kbd.css` |
| `LLMLoader` | An animated status while an LLM prepares a response | `@mvxmxm/maxos/llm-loader.css` |
| `Menu` | Selecting an option from a panel with optional icons | `@mvxmxm/maxos/menu.css` |

Pass `checked` & `onCheckedChange` to `Switch` (default toggle). For the cycle variant, pass `variant="cycle"`, `value`, `options`, & `onValueChange`. Give either an accessible name with an associated label or `aria-label`.

`<LLMLoader />` displays “Thinking”. Pass children to customize the label. The text stays static when reduced motion is enabled.

Pass `label`, `items`, `value`, and `onChange` to `Menu`. Each item accepts an optional decorative `icon` React node.

From the portfolio repo, run `npm pack --workspace @mvxmxm/maxos` to build and create a versioned tarball. Install that tarball in another React project with `npm install /path/to/mvxmxm-maxos-0.4.0.tgz`.

The portfolio builds the workspace package before `npm run dev` and `npm run build`. When editing the package during a dev session, run `npm run build --workspace @mvxmxm/maxos -- --watch` in a second terminal.
