# MaxOS

MaxOS shares the React components shown at `/system`. Each component has a separate stylesheet.

```tsx
import { SegmentedController } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/segmented-controller.css';
```

Pass an accessible `label`, an `items` array of `{ id, label }` objects, the selected `value`, and an `onChange` callback. The app supplies React and owns the selected value. The stylesheet includes default colors and uses Archivo when available. For a shadow DOM consumer such as ELIX, include the stylesheet inside the shadow root.

```tsx
import { Slider } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/slider.css';
```

Pass an accessible `label`, integer `min` and `max` bounds with `min < max`, a controlled `value`, and an `onChange` callback. The slider has one stop per integer. Set `center` to a stop to mark it and start the fill there. Use `valueText` when numbers need a descriptive label, such as “Distill, 25% shorter.” The app decides what to do with the selected value.

```tsx
import { Scrubber } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/scrubber.css';
```

Pass a `label`, a positive integer `count`, a zero-based stop position as `value`, an `onChange` callback, and a `formatValue` function. Use `tickLabel` to label major ticks and `formatProgress` to format the visual readout between stops. Set `animateValue` to roll changing digits in a plain numeric readout. Set `subdivisions` to a positive integer to divide each interval into smaller selectable steps. The `onChange` callback reports the nearest selectable position. The ruler supports touch scrolling, pointer dragging, and arrow keys.

```tsx
import { DirectionSlider } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/direction-slider.css';
```

Pass a group `label` and arrays of stops in visual order on the `left` and `right` of neutral. Each stop has an `id`, a `label`, and an optional `preview`. The slider calls `onSelect` with the chosen stop on release or keyboard activation and returns the band to neutral. Use `leftIcon` and `rightIcon` to identify the directions.

```tsx
import { VolumeSlider } from '@mvxmxm/maxos';
import '@mvxmxm/maxos/volume-slider.css';
```

Pass a controlled `value` from 0 to 100 and an `onChange` callback. Use `icon` for an optional speaker icon and `label` to customize the accessible name.

From the portfolio repo, run `npm pack --workspace @mvxmxm/maxos` to build and create a versioned tarball. Install that tarball in another React project with `npm install /path/to/mvxmxm-maxos-0.1.0.tgz`.

The portfolio builds the workspace package before `npm run dev` and `npm run build`. When editing the package during a dev session, run `npm run build --workspace @mvxmxm/maxos -- --watch` in a second terminal.
