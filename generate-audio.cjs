const fs = require('fs');
const path = require('path');

function generateTone(frequency, duration, volume = 0.3) {
  const sampleRate = 44100;
  const numSamples = Math.ceil((sampleRate * duration) / 1000);
  const buffer = Buffer.alloc(44 + numSamples * 2, 0);
  
  // WAV header
  const dataSize = numSamples * 2;
  const fileSize = 44 + dataSize;
  
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  
  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume;
    const val = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
  }
  
  return buffer;
}

function generateBeepSequence(frequencies, duration, gap = 100, volume = 0.3) {
  const sampleRate = 44100;
  const totalDuration = frequencies.length * (duration + gap);
  const numSamplesPerTone = Math.ceil((sampleRate * duration) / 1000);
  const gapSamples = Math.ceil((sampleRate * gap) / 1000);
  const totalSamples = frequencies.length * (numSamplesPerTone + gapSamples);
  const totalData = totalSamples * 2;
  const buffer = Buffer.alloc(44 + totalData, 0);
  
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(44 + totalData - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(totalData, 40);
  
  let offset = 44;
  for (const freq of frequencies) {
    for (let i = 0; i < numSamplesPerTone; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * freq * t) * volume;
      buffer.writeInt16LE(Math.floor(sample * 32767), offset);
      offset += 2;
    }
    for (let i = 0; i < gapSamples; i++) {
      buffer.writeInt16LE(0, offset);
      offset += 2;
    }
  }
  
  return buffer;
}

const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Critical alert: two high-pitched tones (urgent)
fs.writeFileSync(path.join(audioDir, 'alert-critical.wav'), generateBeepSequence([880, 880], 300, 150, 0.4));
console.log('Created alert-critical.wav');

// Warning alert: single mid tone
fs.writeFileSync(path.join(audioDir, 'alert-warning.wav'), generateBeepSequence([587], 400, 0, 0.3));
console.log('Created alert-warning.wav');

// Message: gentle tone
fs.writeFileSync(path.join(audioDir, 'message.wav'), generateBeepSequence([523], 200, 0, 0.25));
console.log('Created message.wav');

// Visit start: ascending tone
fs.writeFileSync(path.join(audioDir, 'visit-start.wav'), generateBeepSequence([440, 523, 659], 200, 80, 0.25));
console.log('Created visit-start.wav');

// Info: single low tone
fs.writeFileSync(path.join(audioDir, 'alert-info.wav'), generateBeepSequence([349], 300, 0, 0.2));
console.log('Created alert-info.wav');
