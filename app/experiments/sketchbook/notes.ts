export type SketchNote = {
  title: string;
  body: string;
};

const NOTES: Record<string, SketchNote> = {
  '001': {
    title: 'Text Experiments',
    body: 'Weight as a hover state. The word should feel like it is thinking — not bouncing, not glowing. Just getting denser.',
  },
  '002': {
    title: 'Yutori UI',
    body: 'Chrome for an agent that has to live on a page, not in a panel. Smaller than a product. Bigger than a widget.',
  },
  '003': {
    title: 'Rams Dial',
    body: 'Less, but a dial. Wanted the click of a physical stop — the kind you can feel without looking.',
  },
  '006': {
    title: 'Follow the light',
    body: 'Glass as a material, not a trend. If the light does not travel through it, it is just a gradient with extra steps.',
  },
  '008': {
    title: 'ASCII',
    body: 'Type as image. Density is the only shade. Zoom out until the letters stop being letters.',
  },
  '011': {
    title: 'ASCII, again',
    body: 'Another pass at pictures made of characters. Scale is the whole trick — too small & it is noise, too large & it is a joke.',
  },
  '015': {
    title: 'Mia',
    body: 'A voice, a blur, a page that does not want to be a form. Soft focus as a kind of manners.',
  },
  '016': {
    title: 'Linetime',
    body: 'Time as a line you can actually hold. Scrubbing should feel closer to tape than to a slider.',
  },
  '017': {
    title: 'CLI Loaders',
    body: 'Waiting should have a personality. Terminals already knew this — we just forgot it in the GUI.',
  },
  '018': {
    title: 'Input Expand',
    body: 'Search the horizon. The field grows to match the question, instead of clipping it to a 40px bar.',
  },
  '020': {
    title: 'Loupe',
    body: 'Reading with a glass. The page stays paper; the lens is the UI. Pointer as a physical object sitting on the desk.',
  },
  '024': {
    title: 'Shader Starter',
    body: 'A flower of pixels. Mouse as weather — speed, hue, how hard the petals spin.',
  },
  '026': {
    title: 'Talking to the orb',
    body: 'Same shader, now it listens. Mood as a uniform. The chat is just a way to turn the light.',
  },
  '027': {
    title: 'Stacked windows',
    body: 'A fan of browsers. Hover as a reveal, not a click — the stack should breathe when you point at it.',
  },
  '028': {
    title: 'Spiral windows',
    body: 'Same windows, thrown into orbit. Wanted the feeling of too many surfaces arriving at once.',
  },
  '029': {
    title: 'SVG Transition',
    body: 'One shape becoming another. The in-between is the whole piece — if the morph is ugly, the idea is wrong.',
  },
  '030': {
    title: 'Flower planet',
    body: 'Same planet, now a meadow. Painted petals on stems that lean in the wind — the blue still showing through.',
  },
};

export function noteFor(id: string): SketchNote {
  return (
    NOTES[id] ?? {
      title: `Experiment ${id}`,
      body: 'A page from the sketchbook. Still finding the sentence for this one.',
    }
  );
}
