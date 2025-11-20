import { VoiceEffect } from "../types";

// Convert Float32Array (Web Audio API) to Int16 PCM (Gemini API)
export function float32ToInt16PCM(float32Arr: Float32Array): ArrayBuffer {
  const int16Arr = new Int16Array(float32Arr.length);
  for (let i = 0; i < float32Arr.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Arr[i]));
    int16Arr[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Arr.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Manual PCM Decoder for Gemini Raw Audio
export function pcmToAudioBuffer(
  buffer: ArrayBuffer, 
  ctx: AudioContext, 
  sampleRate: number
): AudioBuffer {
  const packet = new Uint8Array(buffer);
  // Create Int16 view. Ensure we handle byte length correctly for 16-bit samples.
  const numSamples = Math.floor(packet.byteLength / 2);
  const int16 = new Int16Array(packet.buffer, packet.byteOffset, numSamples);
  
  const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  for (let i = 0; i < int16.length; i++) {
    // Int16 is -32768 to 32767. Float32 is -1.0 to 1.0
    channelData[i] = int16[i] / 32768.0;
  }
  
  return audioBuffer;
}

// "Jungle" Pitch Shifter / Phase Vocoder Effect
// Uses dual modulated delay lines to pitch shift without changing speed.
const createJunglePitchShifter = (ctx: AudioContext, inputNode: AudioNode, pitchRatio: number): AudioNode => {
  const bufferSize = 4096;
  const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
  
  const delayTime = 0.060; // 60ms delay window
  const bufferSamples = Math.ceil(delayTime * ctx.sampleRate) + bufferSize; 
  const delayBuffer = new Float32Array(bufferSamples * 2); // Double size for safety
  
  let writeIndex = 0;
  let phase = 0; // 0 to 1
  
  // freq = (1 - pitchRatio) / delayWindow
  const freq = (1 - pitchRatio) / delayTime;
  
  scriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      
      for (let i = 0; i < input.length; i++) {
          // 1. Write to circular buffer
          delayBuffer[writeIndex] = input[i];
          
          // 2. Calculate delay positions
          const p1 = phase;
          const p2 = (phase + 0.5) % 1.0;
          
          // Delay in samples
          const d1 = p1 * delayTime * ctx.sampleRate;
          const d2 = p2 * delayTime * ctx.sampleRate;
          
          // Read indices
          let r1 = writeIndex - d1;
          let r2 = writeIndex - d2;
          
          // Proper Circular Buffer Logic:
          const len = delayBuffer.length;
          
          while(r1 < 0) r1 += len;
          while(r2 < 0) r2 += len;
          while(r1 >= len) r1 -= len;
          while(r2 >= len) r2 -= len;
          
          // Linear Interpolation
          const i1 = Math.floor(r1);
          const f1 = r1 - i1;
          const s1 = delayBuffer[i1] * (1-f1) + delayBuffer[(i1+1)%len] * f1;
          
          const i2 = Math.floor(r2);
          const f2 = r2 - i2;
          const s2 = delayBuffer[i2] * (1-f2) + delayBuffer[(i2+1)%len] * f2;
          
          // 3. Crossfade (Windowing)
          let gain1 = 0;
          if (p1 <= 0.5) gain1 = p1 * 2;
          else gain1 = (1 - p1) * 2;
          
          const gain2 = 1 - gain1;
          
          output[i] = s1 * gain1 + s2 * gain2;
          
          // Increment pointers
          writeIndex++;
          if (writeIndex >= len) writeIndex = 0;
          
          // Increment Phase
          phase += freq / ctx.sampleRate;
          if (phase >= 1.0) phase -= 1.0;
          if (phase < 0.0) phase += 1.0;
      }
  };
  
  inputNode.connect(scriptNode);
  return scriptNode;
};

export const createVoiceEffectNode = (
  ctx: AudioContext, 
  source: MediaStreamAudioSourceNode, 
  effect: VoiceEffect, 
  dest: MediaStreamAudioDestinationNode
) => {
  try { source.disconnect(); } catch (e) {}

  const input = ctx.createGain();
  source.connect(input);
  
  let output: AudioNode = input;

  // 1. Voice Transformer
  if (effect === VoiceEffect.Cute) {
     // Pitch 1.35 is a sweet spot for "Anime/Cute"
     output = createJunglePitchShifter(ctx, output, 1.35);
     
     const highShelf = ctx.createBiquadFilter();
     highShelf.type = 'highshelf';
     highShelf.frequency.value = 4000;
     highShelf.gain.value = 6; 
     
     const lowCut = ctx.createBiquadFilter();
     lowCut.type = 'highpass';
     lowCut.frequency.value = 150; 
     
     output.connect(highShelf);
     highShelf.connect(lowCut);
     output = lowCut;
  } 
  else if (effect === VoiceEffect.Deep) {
     output = createJunglePitchShifter(ctx, output, 0.75);
     
     const lowShelf = ctx.createBiquadFilter();
     lowShelf.type = 'lowshelf';
     lowShelf.frequency.value = 200;
     lowShelf.gain.value = 5;
     
     const highCut = ctx.createBiquadFilter();
     highCut.type = 'lowpass';
     highCut.frequency.value = 3000;
     
     output.connect(lowShelf);
     lowShelf.connect(highCut);
     output = highCut;
  }
  else if (effect === VoiceEffect.Robot) {
     const osc = ctx.createOscillator();
     osc.type = 'sine';
     osc.frequency.value = 50; 
     osc.start();
     
     const carrier = ctx.createGain();
     carrier.gain.value = 0; 
     osc.connect(carrier.gain);
     input.connect(carrier);
     
     const dry = ctx.createGain();
     dry.gain.value = 0.5;
     input.connect(dry);
     
     const wet = ctx.createGain();
     wet.gain.value = 0.8;
     carrier.connect(wet);
     
     const merger = ctx.createChannelMerger(1);
     dry.connect(merger);
     wet.connect(merger);
     output = merger;
  }

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  
  output.connect(compressor);
  compressor.connect(dest);
};