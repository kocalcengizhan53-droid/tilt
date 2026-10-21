// Synthesises the arcade's sounds as 16-bit WAV files. No samples, no licences: every sound
// is a short sine or noise envelope, written once and committed to assets/audio.
import { writeFileSync, mkdirSync } from "node:fs"

const RATE = 22050
const wav = (samples) => {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2))
  const h = Buffer.alloc(44)
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8)
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write("data", 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}
const tone = (notes, { attack = 0.004, release = 0.6, gain = 0.5, wave = "sine" } = {}) => {
  const out = []
  for (const [freq, secs] of notes) {
    const n = Math.round(RATE * secs)
    for (let i = 0; i < n; i++) {
      const t = i / RATE
      const env = Math.min(1, t / attack) * Math.pow(1 - i / n, release)
      const ph = 2 * Math.PI * freq * t
      const v = wave === "square" ? Math.sign(Math.sin(ph)) * 0.5 : wave === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph)
      out.push(v * env * gain)
    }
  }
  return out
}
const noise = (secs, gain = 0.4) => {
  const n = Math.round(RATE * secs)
  return Array.from({ length: n }, (_, i) => (Math.random() * 2 - 1) * gain * Math.pow(1 - i / n, 2))
}

mkdirSync("assets/audio", { recursive: true })
const sounds = {
  tap: tone([[880, 0.05]], { gain: 0.35 }),
  drop: tone([[196, 0.09]], { wave: "tri", gain: 0.5 }),
  perfect: tone([[659, 0.07], [988, 0.12]], { gain: 0.45 }),
  hit: noise(0.06, 0.45),
  bounce: tone([[440, 0.04]], { wave: "square", gain: 0.25 }),
  lose: tone([[392, 0.12], [311, 0.12], [233, 0.22]], { wave: "tri", gain: 0.45 }),
  win: tone([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]], { gain: 0.45 }),
  tick: tone([[1320, 0.025]], { gain: 0.25 }),
  merge: tone([[523, 0.05], [784, 0.08]], { gain: 0.35 }),
  padA: tone([[262, 0.22]], { gain: 0.4, release: 0.4 }),
  padB: tone([[330, 0.22]], { gain: 0.4, release: 0.4 }),
  padC: tone([[392, 0.22]], { gain: 0.4, release: 0.4 }),
  padD: tone([[523, 0.22]], { gain: 0.4, release: 0.4 }),
}
for (const [name, samples] of Object.entries(sounds)) writeFileSync(`assets/audio/${name}.wav`, wav(samples))
console.log(Object.keys(sounds).join(" "))
