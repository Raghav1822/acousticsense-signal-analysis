import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeSignal,
  applyFilter,
  calculateSpectrum,
  calculateSpectrogram,
  DEFAULT_SAMPLE_RATE,
  generateSample
} from "./signal.js";

test("FFT locates a known acoustic tone", () => {
  const rate = 8192;
  const signal = Float64Array.from({ length: 8192 }, (_, index) => Math.sin(2 * Math.PI * 1024 * index / rate));
  const bins = calculateSpectrum(signal, rate);
  const peak = bins.reduce((best, item) => item.amplitude > best.amplitude ? item : best, bins[0]);
  assert.equal(peak.frequency, 1024);
  assert.ok(Math.abs(peak.amplitude - 1) < 0.02);
});

test("60 Hz notch suppresses mains energy without removing a 1 kHz tone", () => {
  const rate = 8192;
  const signal = Float64Array.from({ length: 8192 }, (_, index) =>
    Math.sin(2 * Math.PI * 60 * index / rate) + Math.sin(2 * Math.PI * 1000 * index / rate));
  const filtered = applyFilter(signal, rate, "notch60");
  const before = calculateSpectrum(signal, rate);
  const after = calculateSpectrum(filtered, rate);
  const amplitudeAt = (bins, frequency) => bins.find((bin) => bin.frequency === frequency).amplitude;
  assert.ok(amplitudeAt(after, 60) < amplitudeAt(before, 60) * 0.2);
  assert.ok(amplitudeAt(after, 1000) > amplitudeAt(before, 1000) * 0.8);
});

test("spectrogram produces overlapping frames with the expected frequency bins", () => {
  const result = calculateSpectrogram(new Float64Array(2048), DEFAULT_SAMPLE_RATE, 512, 128);
  assert.equal(result.frames.length, 13);
  assert.equal(result.frames[0].length, 256);
  assert.equal(result.hopSize, 128);
});

test("synthetic capture scenarios exercise distinct regime and fault screens", () => {
  const baseline = analyzeSignal(generateSample("baseline"), DEFAULT_SAMPLE_RATE);
  const transition = analyzeSignal(generateSample("transition"), DEFAULT_SAMPLE_RATE);
  const crack = analyzeSignal(generateSample("crack"), DEFAULT_SAMPLE_RATE);
  const bearing = analyzeSignal(generateSample("bearing"), DEFAULT_SAMPLE_RATE);
  const film = analyzeSignal(generateSample("film"), DEFAULT_SAMPLE_RATE);

  assert.match(baseline.boiling.regime, /Quiet/);
  assert.match(transition.boiling.regime, /Transition/);
  assert.match(film.boiling.regime, /Film/);
  assert.match(crack.boiling.regime, /not boiling-specific/);
  assert.match(crack.fault.label, /crack-like/);
  assert.match(bearing.fault.label, /bearing-like/);
});
