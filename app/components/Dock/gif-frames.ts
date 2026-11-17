type GifPatch = {
  left: number;
  top: number;
  width: number;
  height: number;
  delay: number;
  disposal: number;
  transparent: number;
  interlaced: boolean;
  colors: Uint8Array;
  indexes: Uint8Array;
};

export type GifReel = {
  width: number;
  height: number;
  frameCount: number;
  /** Length of one loop, in milliseconds. */
  duration: number;
  index: number;
  delay: number;
  pixels: Uint8ClampedArray;
  /** Show the frame the page would be on `elapsed` ms after the GIF started. */
  sync(elapsed: number): void;
};

// A detached Image stays on frame 0, and Safari has no image-decoder clock for GIFs.
// Frame delays are the page's clock. sync() seeks to where that loop is now.
export function openGif(bytes: Uint8Array): GifReel | null {
  const frames = parseGif(bytes);
  if (!frames || frames.length < 2) return null;
  const width = readU16(bytes, 6);
  const height = readU16(bytes, 8);
  if (width < 1 || height < 1) return null;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let previous: Uint8ClampedArray | null = null;
  const draw = (frame: GifPatch) => {
    previous = frame.disposal === 3 ? pixels.slice() : null;
    blit(pixels, width, height, frame);
  };
  const dispose = (frame: GifPatch) => {
    if (frame.disposal === 2) clearPatch(pixels, width, height, frame);
    else if (frame.disposal === 3 && previous) pixels.set(previous);
  };
  draw(frames[0]);
  let index = 0;
  const duration = frames.reduce((total, frame) => total + frame.delay, 0);
  const advance = () => {
    dispose(frames[index]);
    index = (index + 1) % frames.length;
    if (index === 0) pixels.fill(0);
    draw(frames[index]);
  };
  return {
    width,
    height,
    frameCount: frames.length,
    duration,
    get index() {
      return index;
    },
    get delay() {
      return frames[index].delay;
    },
    pixels,
    sync(elapsed: number) {
      if (duration <= 0) return;
      const at = ((elapsed % duration) + duration) % duration;
      let covered = 0;
      let cursor = 0;
      for (let frame = 0; frame < frames.length; frame += 1) {
        if (at < covered + frames[frame].delay) {
          cursor = frame;
          break;
        }
        covered += frames[frame].delay;
      }
      let guard = 0;
      while (index !== cursor && guard < frames.length) {
        advance();
        guard += 1;
      }
    },
  };
}

function parseGif(bytes: Uint8Array): GifPatch[] | null {
  if (bytes.length < 13 || bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;
  let pos = 13;
  const packed = bytes[10];
  let globalColors: Uint8Array | null = null;
  if (packed & 0x80) {
    const size = 3 * (1 << ((packed & 7) + 1));
    globalColors = bytes.subarray(pos, pos + size);
    pos += size;
  }
  const frames: GifPatch[] = [];
  let delay = 100;
  let disposal = 0;
  let transparent = -1;
  while (pos < bytes.length) {
    const marker = bytes[pos++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      const label = bytes[pos++];
      if (label === 0xf9 && bytes[pos] === 4) {
        pos += 1;
        const flags = bytes[pos++];
        delay = Math.max(20, (bytes[pos] | (bytes[pos + 1] << 8)) * 10 || 100);
        pos += 2;
        transparent = flags & 1 ? bytes[pos++] : -1;
        if (!(flags & 1)) pos += 1;
        disposal = (flags >> 2) & 7;
        pos += 1;
      } else {
        pos = skipBlocks(bytes, pos);
      }
      continue;
    }
    if (marker !== 0x2c) {
      pos = skipBlocks(bytes, pos);
      continue;
    }
    const left = readU16(bytes, pos);
    const top = readU16(bytes, pos + 2);
    const width = readU16(bytes, pos + 4);
    const height = readU16(bytes, pos + 6);
    pos += 8;
    const imageFlags = bytes[pos++];
    let colors = globalColors;
    if (imageFlags & 0x80) {
      const size = 3 * (1 << ((imageFlags & 7) + 1));
      colors = bytes.subarray(pos, pos + size);
      pos += size;
    }
    if (!colors || width < 1 || height < 1) return frames.length ? frames : null;
    const minCodeSize = bytes[pos++];
    const compressed = readBlocks(bytes, pos);
    pos = compressed.pos;
    const indexes = lzwDecode(minCodeSize, compressed.data, width * height);
    if (!indexes) return frames.length ? frames : null;
    frames.push({
      left,
      top,
      width,
      height,
      delay,
      disposal,
      transparent,
      interlaced: Boolean(imageFlags & 0x40),
      colors,
      indexes,
    });
    delay = 100;
    disposal = 0;
    transparent = -1;
  }
  return frames;
}

function lzwDecode(minCodeSize: number, data: Uint8Array, count: number) {
  if (minCodeSize < 2 || minCodeSize > 8) return null;
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  const prefix = new Int16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4096);
  const pixels = new Uint8Array(count);
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  let prevCode = -1;
  let bitBuffer = 0;
  let bitCount = 0;
  let cursor = 0;
  let written = 0;
  const readCode = () => {
    while (bitCount < codeSize) {
      if (cursor >= data.length) return -1;
      bitBuffer |= data[cursor++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  };
  const first = (code: number) => {
    let current = code;
    while (current >= clear) current = prefix[current];
    return current;
  };
  const write = (code: number) => {
    let current = code;
    let depth = 0;
    while (current >= clear) {
      stack[depth++] = suffix[current];
      current = prefix[current];
    }
    stack[depth++] = current;
    while (depth && written < count) pixels[written++] = stack[--depth];
  };
  while (written < count) {
    const code = readCode();
    if (code < 0 || code === eoi) break;
    if (code === clear) {
      codeSize = minCodeSize + 1;
      nextCode = eoi + 1;
      prevCode = -1;
      continue;
    }
    if (prevCode < 0) {
      write(code);
      prevCode = code;
      continue;
    }
    let append = 0;
    if (code < nextCode) {
      append = first(code);
      write(code);
    } else if (code === nextCode) {
      append = first(prevCode);
      write(prevCode);
      if (written < count) pixels[written++] = append;
    } else {
      break;
    }
    if (nextCode < 4096) {
      prefix[nextCode] = prevCode;
      suffix[nextCode] = append;
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) codeSize += 1;
    }
    prevCode = code;
  }
  return written ? pixels : null;
}

function deinterlace(indexes: Uint8Array, width: number, height: number) {
  const rows = new Uint8Array(indexes.length);
  const passes = [
    [0, 8],
    [4, 8],
    [2, 4],
    [1, 2],
  ];
  let source = 0;
  for (const [start, step] of passes) {
    for (let y = start; y < height && source < indexes.length; y += step) {
      rows.set(indexes.subarray(source, source + width), y * width);
      source += width;
    }
  }
  return rows;
}

function blit(screen: Uint8ClampedArray, screenW: number, screenH: number, frame: GifPatch) {
  const indexes = frame.interlaced ? deinterlace(frame.indexes, frame.width, frame.height) : frame.indexes;
  for (let y = 0; y < frame.height; y += 1) {
    const dy = frame.top + y;
    if (dy < 0 || dy >= screenH) continue;
    for (let x = 0; x < frame.width; x += 1) {
      const dx = frame.left + x;
      if (dx < 0 || dx >= screenW) continue;
      const colorIndex = indexes[y * frame.width + x];
      if (colorIndex === frame.transparent) continue;
      const color = colorIndex * 3;
      const offset = (dy * screenW + dx) * 4;
      screen[offset] = frame.colors[color] ?? 0;
      screen[offset + 1] = frame.colors[color + 1] ?? 0;
      screen[offset + 2] = frame.colors[color + 2] ?? 0;
      screen[offset + 3] = 255;
    }
  }
}

function clearPatch(screen: Uint8ClampedArray, screenW: number, screenH: number, frame: GifPatch) {
  for (let y = 0; y < frame.height; y += 1) {
    const dy = frame.top + y;
    if (dy < 0 || dy >= screenH) continue;
    for (let x = 0; x < frame.width; x += 1) {
      const dx = frame.left + x;
      if (dx < 0 || dx >= screenW) continue;
      const offset = (dy * screenW + dx) * 4;
      screen[offset] = 0;
      screen[offset + 1] = 0;
      screen[offset + 2] = 0;
      screen[offset + 3] = 0;
    }
  }
}

function readBlocks(bytes: Uint8Array, pos: number) {
  const parts: Uint8Array[] = [];
  let total = 0;
  while (pos < bytes.length) {
    const size = bytes[pos++];
    if (!size) break;
    parts.push(bytes.subarray(pos, pos + size));
    total += size;
    pos += size;
  }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return { data, pos };
}

function skipBlocks(bytes: Uint8Array, pos: number) {
  while (pos < bytes.length) {
    const size = bytes[pos++];
    if (!size) break;
    pos += size;
  }
  return pos;
}

function readU16(bytes: Uint8Array, pos: number) {
  return bytes[pos] | (bytes[pos + 1] << 8);
}
