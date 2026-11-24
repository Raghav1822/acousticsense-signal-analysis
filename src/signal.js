const TWO_PI = 2 * Math.PI;
export const DEFAULT_SAMPLE_RATE = 8192;
export const SAMPLE_COUNT = 8192;

export const DEMO_SCENARIOS = [
  { id: "nucleate", name: "Nucleate boiling", note: "Fine, steady bubble activity" },
  { id: "transition", name: "Boiling transition", note: "Dense broadband bubble collapse" },
  { id: "film", name: "Film boiling", note: "Lower-frequency vapor blanket signature" },
  { id: "crack", name: "Crack impacts", note: "Sparse, high-crest acoustic bursts" },
  { id: "bearing", name: "Bearing resonance", note: "Repetitive impact train with ring-down" },
  { id: "baseline", name: "Quiet baseline", note: "Low-energy reference capture" }
];

export function generateSample(scenario = "nucleate", count = SAMPLE_COUNT, sampleRate = DEFAULT_SAMPLE_RATE) {
  let seed = 12031 + DEMO_SCENARIOS.findIndex((item) => item.id === scenario) * 991;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const noise = () => (random() * 2 - 1);
  const signal = new Float64Array(count);

  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const white = noise();
    let value = white * (scenario === "transition" ? 0.26 : scenario === "baseline" ? 0.018 : 0.045);

    if (scenario === "baseline") {
      value += 0.035 * Math.sin(TWO_PI * 260 * time);
    } else if (scenario === "film") {
      value += 0.32 * Math.sin(TWO_PI * 170 * time)
        + 0.15 * Math.sin(TWO_PI * 420 * time + 0.4)
        + 0.06 * Math.sin(TWO_PI * 880 * time);
    } else if (scenario === "nucleate") {
      value += 0.08 * Math.sin(TWO_PI * 320 * time);
      value += pulseTrain(time, 0.052, 0.38, 1180, 0.0015);
    } else if (scenario === "transition") {
      value += 0.12 * Math.sin(TWO_PI * 520 * time);
      value += pulseTrain(time, 0.019, 0.3, 1650, 0.0012, 0.009);
    } else if (scenario === "crack") {
      value += 0.025 * Math.sin(TWO_PI * 190 * time);
      value += pulseTrain(time, 0.112, 1.25, 2180, 0.00055, 0.032);
    } else if (scenario === "bearing") {
      value += 0.1 * Math.sin(TWO_PI * 410 * time);
      value += pulseTrain(time, 0.034, 0.46, 1450, 0.0026, 0.005);
    }

    signal[index] = value;
  }
  return signal;
}

function pulseTrain(time, interval, amplitude, frequency, decay, jitter = 0) {
  let nearest = time % interval;
  const previous = Math.floor(time / interval) * interval;
  const next = previous + interval;
  if (Math.abs(time - next) < nearest) nearest = time - next;
  const shift = jitter ? Math.sin(Math.floor(time / interval) * 13.7) * jitter : 0;
  const age = Math.abs(nearest - shift);
  if (age > decay * 8) return 0;
  return amplitude * Math.exp(-age / decay) * Math.cos(TWO_PI * frequency * age);
}

export function analyzeSignal(input, sampleRate, filter = "raw") {
  if (!(sampleRate > 0) || input.length < 32) throw new Error("Provide at least 32 samples and a valid sample rate.");
  const processed = applyFilter(input, sampleRate, filter);
  const bins = calculateSpectrum(processed, sampleRate);
  const frames = calculateSpectrogram(processed, sampleRate);
  const features = extractFeatures(processed, bins, frames, sampleRate);
  return {
    samples: processed,
    spectrum: bins,
    spectrogram: frames,
    features,
    boiling: classifyBoiling(features),
    fault: detectFault(features),
    sampleRate,
    sampleCount: processed.length,
    filter
  };
}

export function applyFilter(samples, sampleRate, mode = "raw") {
  if (mode === "raw") return Float64Array.from(samples);
  if (mode === "notch60") {
    if (sampleRate <= 120) throw new Error("The 60 Hz notch requires a sample rate above 120 Hz.");
    return runBiquad(samples, sampleRate, "notch", 60, 30);
  }
  if (mode === "bandpass") {
    if (sampleRate <= 7000) throw new Error("The 350–3500 Hz band-pass requires a sample rate above 7 kHz.");
    return runBiquad(runBiquad(samples, sampleRate, "highpass", 350), sampleRate, "lowpass", Math.min(3500, sampleRate * 0.44));
  }
  if (mode === "lowpass") {
    if (sampleRate <= 1) throw new Error("A sample rate above 1 Hz is required for low-pass filtering.");
    return runBiquad(samples, sampleRate, "lowpass", Math.min(1800, sampleRate * 0.44));
  }
  throw new Error(`Unknown filter: ${mode}`);
}

export function calculateSpectrum(samples, sampleRate) {
  const size = nextPowerOfTwo(samples.length);
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const windowSum = samples.length / 2;
  for (let index = 0; index < samples.length; index += 1) {
    const hann = 0.5 * (1 - Math.cos((TWO_PI * index) / Math.max(1, samples.length - 1)));
    real[index] = (samples[index] - mean) * hann;
  }
  fft(real, imaginary);
  return Array.from({ length: size / 2 }, (_, index) => ({
    frequency: (index * sampleRate) / size,
    amplitude: (2 * Math.hypot(real[index], imaginary[index])) / windowSum
  }));
}

export function calculateSpectrogram(samples, sampleRate, windowSize = 512, hopSize = 128) {
  const frames = [];
  const window = new Float64Array(windowSize);
  const imaginary = new Float64Array(windowSize);
  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    const mean = averageRange(samples, start, windowSize);
    for (let index = 0; index < windowSize; index += 1) {
      window[index] = (samples[start + index] - mean) * 0.5 * (1 - Math.cos((TWO_PI * index) / (windowSize - 1)));
      imaginary[index] = 0;
    }
    fft(window, imaginary);
    frames.push(Array.from({ length: windowSize / 2 }, (_, bin) => Math.hypot(window[bin], imaginary[bin])));
  }
  return { frames, windowSize, hopSize, sampleRate };
}

export function extractFeatures(samples, spectrum, spectrogram, sampleRate) {
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const centered = Array.from(samples, (value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value ** 2, 0) / samples.length;
  const rms = Math.sqrt(variance);
  const peak = samples.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
  const kurtosis = variance > 0
    ? centered.reduce((sum, value) => sum + value ** 4, 0) / samples.length / (variance ** 2)
    : 0;
  const power = spectrum.map((bin) => bin.amplitude ** 2);
  const totalPower = power.reduce((sum, value) => sum + value, 0) || 1;
  const centroid = spectrum.reduce((sum, bin, index) => sum + bin.frequency * power[index], 0) / totalPower;
  const highPower = spectrum.reduce((sum, bin, index) => sum + (bin.frequency >= Math.min(2000, sampleRate * 0.3) ? power[index] : 0), 0);
  const probabilities = power.map((value) => value / totalPower).filter((value) => value > 0);
  const entropy = probabilities.reduce((sum, value) => sum - value * Math.log(value), 0) / Math.log(Math.max(2, probabilities.length));
  const windowRms = [];
  const blockSize = 64;
  for (let start = 0; start + blockSize <= samples.length; start += blockSize) {
    windowRms.push(Math.sqrt(averageRange(samples, start, blockSize, true)));
  }
  const sortedWindows = [...windowRms].sort((a, b) => a - b);
  const medianWindow = sortedWindows[Math.floor(sortedWindows.length / 2)] || 0;
  const threshold = Math.max(medianWindow * 2.1, 0.04);
  const events = countRuns(windowRms, (value) => value > threshold);
  const duration = samples.length / sampleRate;
  const burstRate = events / Math.max(duration, 0.001);
  const highFrequencyRatio = highPower / totalPower;
  const flatness = spectralFlatness(power);

  return {
    rms,
    peak,
    crestFactor: rms ? peak / rms : 0,
    kurtosis,
    centroid,
    spectralEntropy: entropy,
    spectralFlatness: flatness,
    highFrequencyRatio,
    burstCount: events,
    burstRate,
    duration,
    resolutionHz: sampleRate / (spectrum.length * 2),
    frameCount: spectrogram.frames.length
  };
}

function classifyBoiling(features) {
  let regime;
  let reason;
  let confidence;
  if (features.kurtosis > 8 && features.crestFactor > 5) {
    regime = "Impulsive transient · not boiling-specific";
    reason = "Sparse, high-crest events are more consistent with an impact capture than a boiling-regime signature.";
    confidence = 0.82;
  } else if (features.crestFactor > 4.5 && features.kurtosis > 4.2 && features.spectralEntropy > 0.48 && features.spectralEntropy < 0.78) {
    regime = "Repetitive impact train · not boiling-specific";
    reason = "A repeated resonant impact pattern is present; review the mechanical event screen instead.";
    confidence = 0.76;
  } else if (features.rms < 0.07 && features.burstRate < 3) {
    regime = "Quiet / no active boiling";
    reason = "Low acoustic energy and few transient events.";
    confidence = 0.86;
  } else if (features.centroid < 700 && features.highFrequencyRatio < 0.35) {
    regime = "Film-like signature";
    reason = "Energy is concentrated at lower frequencies with a weak high-frequency tail.";
    confidence = 0.74;
  } else if ((features.burstRate > 35 || (features.spectralEntropy > 0.76 && features.rms > 0.12 && features.crestFactor < 6))) {
    regime = "Transition-like signature";
    reason = "Dense bursts and broadband energy suggest an unstable, high-activity regime.";
    confidence = 0.78;
  } else {
    regime = "Nucleate-like signature";
    reason = "Moderate, repeated acoustic events sit above the quiet baseline.";
    confidence = 0.7;
  }
  return { regime, reason, confidence, method: "Transparent feature rules" };
}

function detectFault(features) {
  if (features.kurtosis > 8 && features.crestFactor > 5 && features.burstCount >= 2 && features.burstRate < 45) {
    return {
      label: "Impulsive events — crack-like",
      severity: "watch",
      reason: "Sparse, high-crest transients are present. Check sensor coupling and confirm with a repeat capture."
    };
  }
  if ((features.burstRate >= 20 || (features.crestFactor > 4.5 && features.spectralEntropy > 0.48 && features.spectralEntropy < 0.78))
    && features.kurtosis > 4.2 && features.spectralEntropy < 0.78) {
    return {
      label: "Repetitive impacts — bearing-like",
      severity: "watch",
      reason: "Repeated impacts with a resonant tail are consistent with a possible rolling-element or contact event."
    };
  }
  if (features.rms > 0.48 || features.spectralFlatness > 0.82) {
    return {
      label: "Elevated broadband activity",
      severity: "review",
      reason: "Signal energy is high or broadly distributed. Compare with a known-good operating baseline."
    };
  }
  return {
    label: "No strong transient fault signature",
    severity: "normal",
    reason: "Current screening features remain below the prototype's event thresholds."
  };
}

function spectralFlatness(power) {
  const values = power.filter((value) => value > 1e-14);
  if (!values.length) return 0;
  const geometric = Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
  const arithmetic = values.reduce((sum, value) => sum + value, 0) / values.length;
  return arithmetic ? geometric / arithmetic : 0;
}

function countRuns(values, condition) {
  let count = 0;
  let active = false;
  for (const value of values) {
    if (condition(value) && !active) count += 1;
    active = condition(value);
  }
  return count;
}

function averageRange(values, start, length, square = false) {
  let sum = 0;
  for (let index = start; index < start + length; index += 1) sum += square ? values[index] ** 2 : values[index];
  return sum / length;
}

function runBiquad(samples, sampleRate, type, frequency, q = Math.SQRT1_2) {
  const omega = (TWO_PI * frequency) / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  let b0;
  let b1;
  let b2;
  let a0;
  let a1;
  let a2;
  if (type === "lowpass") {
    b0 = (1 - cosine) / 2; b1 = 1 - cosine; b2 = b0;
    a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
  } else if (type === "highpass") {
    b0 = (1 + cosine) / 2; b1 = -(1 + cosine); b2 = b0;
    a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
  } else {
    b0 = 1; b1 = -2 * cosine; b2 = 1;
    a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  const output = new Float64Array(samples.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const x0 = samples[index];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[index] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return output;
}

function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) size <<= 1;
  return size;
}

function fft(real, imaginary) {
  const size = real.length;
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1;
    while (reversed & bit) { reversed ^= bit; bit >>= 1; }
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = -TWO_PI / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let factorReal = 1;
      let factorImaginary = 0;
      for (let offset = 0; offset < length / 2; offset += 1) {
        const even = start + offset;
        const odd = even + length / 2;
        const evenReal = real[even];
        const evenImaginary = imaginary[even];
        const oddReal = real[odd] * factorReal - imaginary[odd] * factorImaginary;
        const oddImaginary = real[odd] * factorImaginary + imaginary[odd] * factorReal;
        real[odd] = evenReal - oddReal;
        imaginary[odd] = evenImaginary - oddImaginary;
        real[even] = evenReal + oddReal;
        imaginary[even] = evenImaginary + oddImaginary;
        [factorReal, factorImaginary] = [
          factorReal * stepReal - factorImaginary * stepImaginary,
          factorReal * stepImaginary + factorImaginary * stepReal
        ];
      }
    }
  }
}
