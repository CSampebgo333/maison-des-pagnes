export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 24_000_000;
export type OrderPhoto = { bytes: Uint8Array; type: 'image/jpeg' | 'image/png'; width: number; height: number; orientation: number; name: string };

function exifOrientation(bytes: Uint8Array) {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const little = view.getUint16(0) === 0x4949;
    if (!little && view.getUint16(0) !== 0x4d4d) return 1;
    if (view.getUint16(2, little) !== 42) return 1;
    const offset = view.getUint32(4, little), count = Math.min(view.getUint16(offset, little), 256);
    for (let i = 0; i < count; i++) {
      const at = offset + 2 + i * 12;
      if (view.getUint16(at, little) === 0x112 && view.getUint16(at + 2, little) === 3 && view.getUint32(at + 4, little) === 1) {
        const value = view.getUint16(at + 8, little);
        return value >= 1 && value <= 8 ? value : 1;
      }
    }
  } catch { /* Missing or malformed optional orientation metadata. */ }
  return 1;
}

export function inspectPhoto(bytes: Uint8Array, name = 'photo') : OrderPhoto {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw Error('Choisissez une photo de 6 Mo maximum.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let type: OrderPhoto['type'], width = 0, height = 0, orientation = 1, orientationRead = false;
  if (bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b) && view.getUint32(12) === 0x49484452) {
    type = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
    for (let at = 8; at + 12 <= bytes.length;) {
      const length = view.getUint32(at);
      if (length > bytes.length - at - 12) break;
      if (!orientationRead && view.getUint32(at + 4) === 0x65584966) { orientation = exifOrientation(bytes.subarray(at + 8, at + 8 + length)); orientationRead = true; }
      at += length + 12;
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    type = 'image/jpeg';
    for (let at = 2; at + 4 <= bytes.length;) {
      if (bytes[at++] !== 255) break;
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) break;
      if (!orientationRead && marker === 0xe1 && length >= 16 && new TextDecoder().decode(bytes.subarray(at + 2, at + 8)) === 'Exif\0\0') { orientation = exifOrientation(bytes.subarray(at + 8, at + length)); orientationRead = true; }
      if ([0xc0,0xc1,0xc2].includes(marker) && length >= 8) { height = view.getUint16(at + 3); width = view.getUint16(at + 5); }
      at += length;
    }
  } else throw Error('Utilisez une photo JPEG ou PNG. Les fichiers HEIC, WebP et les documents ne sont pas acceptés ici.');
  if (!width || !height) throw Error('Cette image est illisible. Choisissez une autre photo JPEG ou PNG.');
  if (width * height > MAX_PHOTO_PIXELS) throw Error('Cette photo dépasse 24 mégapixels. Choisissez une autre prise de vue de moins de 24 mégapixels.');
  return { bytes, type, width, height, orientation, name: name.slice(0,160) };
}

export async function readOrderPhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) throw Error('Choisissez une photo de 6 Mo maximum.');
  const photo = inspectPhoto(new Uint8Array(await file.arrayBuffer()), file.name);
  const url = URL.createObjectURL(new Blob([photo.bytes as BlobPart], { type: photo.type }));
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(Error('Cette photo est endommagée ou illisible. Choisissez une autre image.'));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
  return photo;
}
