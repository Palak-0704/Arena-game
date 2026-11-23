// Flowbound: fbxEmbeddedMedia.js
// Recovers embedded PNG/JPEG/WEBP textures inside binary FBX models

const BINARY_MAGIC = 'Kaydara FBX Binary';
const HEADER_LENGTH = 27;
const WIDE_VERSION = 7500;

const SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/bmp', bytes: [0x42, 0x4d] }
];

function sniffMime(bytes) {
  for (const { mime, bytes: signature } of SIGNATURES) {
    if (signature.every((byte, index) => bytes[index] === byte)) return mime;
  }
  return null;
}

function basename(path) {
  return String(path).split(/[\\/]/).pop().toLowerCase();
}

class Reader {
  constructor(buffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.wide = this.view.getUint32(23, true) >= WIDE_VERSION;
  }

  header(offset) {
    const { view, wide } = this;
    const end = wide ? Number(view.getBigUint64(offset, true)) : view.getUint32(offset, true);
    const propertyCount = wide
      ? Number(view.getBigUint64(offset + 8, true))
      : view.getUint32(offset + 4, true);
    const propertyLength = wide
      ? Number(view.getBigUint64(offset + 16, true))
      : view.getUint32(offset + 8, true);

    let cursor = offset + (wide ? 24 : 12);
    const nameLength = view.getUint8(cursor);
    cursor += 1;
    const name = String.fromCharCode(...this.bytes.subarray(cursor, cursor + nameLength));
    cursor += nameLength;

    return { end, propertyCount, propertyLength, name, properties: cursor };
  }

  get sentinel() {
    return this.wide ? 25 : 13;
  }

  properties(node) {
    const { view } = this;
    let cursor = node.properties;
    const values = [];

    for (let i = 0; i < node.propertyCount; i++) {
      const type = String.fromCharCode(view.getUint8(cursor));
      cursor += 1;

      switch (type) {
        case 'Y':
          values.push(view.getInt16(cursor, true));
          cursor += 2;
          break;
        case 'C':
          values.push(view.getUint8(cursor) !== 0);
          cursor += 1;
          break;
        case 'I':
          values.push(view.getInt32(cursor, true));
          cursor += 4;
          break;
        case 'F':
          values.push(view.getFloat32(cursor, true));
          cursor += 4;
          break;
        case 'D':
          values.push(view.getFloat64(cursor, true));
          cursor += 8;
          break;
        case 'L':
          values.push(Number(view.getBigInt64(cursor, true)));
          cursor += 8;
          break;
        case 'S':
        case 'R': {
          const length = view.getUint32(cursor, true);
          cursor += 4;
          const raw = this.bytes.subarray(cursor, cursor + length);
          values.push(type === 'S' ? String.fromCharCode(...raw) : raw);
          cursor += length;
          break;
        }
        default: {
          return { values, complete: false };
        }
      }
    }

    return { values, complete: true };
  }

  *children(node) {
    let cursor = node.properties + node.propertyLength;
    while (cursor < node.end - this.sentinel) {
      const child = this.header(cursor);
      if (!child.end) break;
      yield child;
      cursor = child.end;
    }
  }

  *top() {
    let cursor = HEADER_LENGTH;
    while (cursor < this.bytes.length) {
      const node = this.header(cursor);
      if (!node.end) break;
      yield node;
      cursor = node.end;
    }
  }
}

export function extractEmbeddedMedia(buffer) {
  const media = new Map();
  if (!buffer || buffer.byteLength < HEADER_LENGTH) return media;

  const head = String.fromCharCode(...new Uint8Array(buffer, 0, BINARY_MAGIC.length));
  if (head !== BINARY_MAGIC) return media;

  let reader;
  try {
    reader = new Reader(buffer);
  } catch {
    return media;
  }

  try {
    for (const node of reader.top()) {
      if (node.name !== 'Objects') continue;

      for (const child of reader.children(node)) {
        if (child.name !== 'Video') continue;

        let content = null;
        let filename = '';
        for (const property of reader.children(child)) {
          if (property.name === 'Content') {
            const { values } = reader.properties(property);
            if (values[0] instanceof Uint8Array) content = values[0];
          } else if (property.name === 'RelativeFilename' || property.name === 'Filename') {
            const { values } = reader.properties(property);
            if (!filename && typeof values[0] === 'string') filename = values[0];
          }
        }

        if (!content || content.length < 4) continue;

        const mime = sniffMime(content);
        if (!mime) continue;

        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const { values } = reader.properties(child);
        const label = typeof values[1] === 'string' ? values[1].split('\0')[0] : '';

        for (const key of [label, label.replace(/\./g, '_'), basename(filename)]) {
          if (key) media.set(key.toLowerCase(), url);
        }
      }
    }
  } catch (error) {
    console.warn('[fbxEmbeddedMedia] could not read embedded images', error);
  }

  return media;
}
