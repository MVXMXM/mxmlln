# MaxOS

MaxOS is the React component package for the portfolio’s `/system` design system. Import each component from `@mvxmxm/maxos` and load its matching stylesheet.

```tsx
import { SegmentedController } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/segmented-controller.css';
```

Pass an accessible `label`, an `items` array of `{ id, label }` objects, the selected `value`, and an `onChange` callback. The app supplies React and owns the selected value. The stylesheet includes default colors and uses Archivo when available. For a shadow DOM consumer such as ELIX, include the stylesheet inside the shadow root.

| Component | Use it for | Stylesheet |
| --- | --- | --- |
| `SliderScale` | A scrolling ruler with optional fractional stops | `@mvxmxm/maxos/slider-scale.css` |
| `SliderGeneral` | A 0–100 control with relative dragging & a percentage readout | `@mvxmxm/maxos/slider-general.css` |

From the portfolio repo, run `npm pack --workspace @mvxmxm/maxos` to build and create a versioned tarball. Install that tarball in another React project with `npm install /path/to/mvxmxm-maxos-0.2.0.tgz`.

The portfolio builds the workspace package before `npm run dev` and `npm run build`. When editing the package during a dev session, run `npm run build --workspace @mvxmxm/maxos -- --watch` in a second terminal.
