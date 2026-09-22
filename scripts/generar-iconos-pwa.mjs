// Genera los iconos PNG de la PWA sin dependencias externas.
// Huella blanca sobre fondo verde bosque (#154212), igual que el Logo.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(raiz, { recursive: true })

const FONDO = [21, 66, 18, 255]
const HUELLA = [255, 255, 255, 255]

const tablaCrc = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c
  }
  return tabla
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const b of bytes) crc = tablaCrc[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function trozo(tipo, datos) {
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length)
  const tipoBuf = Buffer.from(tipo, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, Buffer.from(datos)])))
  return Buffer.concat([longitud, tipoBuf, Buffer.from(datos), crc])
}

function png(rgba, ancho, alto) {
  const filas = []
  for (let y = 0; y < alto; y++) {
    filas.push(0)
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 4
      filas.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([firma, trozo('IHDR', ihdr), trozo('IDAT', deflateSync(Buffer.from(filas))), trozo('IEND', [])])
}

function enElipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx
  const dy = (py - cy) / ry
  return dx * dx + dy * dy <= 1
}

function dibujarHuella(rgba, s) {
  const u = (v) => (v / 24) * s
  const dedos = [
    [6.5, 9.5, 1.9],
    [11, 7, 2.0],
    [15.5, 9.5, 1.9],
    [18.2, 13.8, 1.6],
    [5.8, 13.8, 1.6],
  ]
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Fondo con esquinas redondeadas
      const r = s * 0.22
      const cx = Math.min(Math.max(x, r), s - r)
      const cy = Math.min(Math.max(y, r), s - r)
      const dx = x - cx
      const dy = y - cy
      const i = (y * s + x) * 4
      if (dx * dx + dy * dy > r * r) {
        rgba[i + 3] = 0
        continue
      }
      rgba[i] = FONDO[0]
      rgba[i + 1] = FONDO[1]
      rgba[i + 2] = FONDO[2]
      rgba[i + 3] = 255
      const px = (x / s) * 24
      const py = (y / s) * 24
      let esHella = dedos.some(([fx, fy, fr]) => enElipse(px, py, fx, fy, fr, fr))
      esHella = esHella || enElipse(px, py, 12, 16.6, 5.6, 4.1)
      if (esHella) {
        rgba[i] = HUELLA[0]
        rgba[i + 1] = HUELLA[1]
        rgba[i + 2] = HUELLA[2]
      }
    }
  }
}

for (const tamano of [180, 192, 512]) {
  const rgba = Buffer.alloc(tamano * tamano * 4)
  dibujarHuella(rgba, tamano)
  writeFileSync(join(raiz, `icono-${tamano}.png`), png(rgba, tamano, tamano))
  console.log(`icono-${tamano}.png generado`)
}
