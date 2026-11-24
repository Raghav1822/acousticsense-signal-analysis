# AcousticSense

**A local-first acoustic emission signal lab for thermal and mechanical systems.**

Explore a waveform from time, frequency, and time-frequency views. Apply practical filters, inspect explainable signal features, and screen for boiling-regime-like signatures or impulsive mechanical events.

## Live demo

After the first successful GitHub Pages deployment:

**https://raghav1822.github.io/acousticsense-signal-analysis/**

The GitHub Actions workflow runs tests, builds the app, and deploys each push to `main`.

## Features

- **Acoustic signal processing:** import WAV audio or CSV amplitude samples, set sample rate, and inspect time waveform and frequency spectrum.
- **Noise filtering:** raw, 350–3500 Hz band-pass, 1800 Hz low-pass, and 60 Hz mains-notch presets.
- **FFT and spectrogram:** Hann-windowed FFT plus an overlapping short-time Fourier transform rendered as a time-frequency heatmap.
- **Boiling regime screening:** transparent feature rules compare low-activity, nucleate-like, transition-like, and film-like acoustic signatures.
- **Mechanical event screening:** kurtosis, crest factor, and burst-rate rules flag crack-like impacts, repetitive bearing-like impacts, or elevated broadband activity.
- **Sample data:** six deterministic synthetic scenarios cover boiling-like signals, crack impacts, bearing resonance, and a quiet baseline. Export demo waveforms as CSV.
- **Private by design:** files are processed in browser memory; no upload endpoint or telemetry.

## Run locally

Requirements: Node.js 20+.

```bash
npm ci
npm test
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Input data

- **WAV:** PCM recordings are decoded locally; the file's native sample rate is used.
- **CSV:** one numeric sample per row. Headers such as `signal`, `amplitude`, `ae`, `voltage`, `sample`, or `acoustic_emission` are recognized. If there is no recognized header, the first non-empty column is used. Optional `sample_rate_hz` sets the acquisition rate.

Set a trustworthy sampling rate and confirm units, gain, coupling, sensor mounting, and clipping before interpreting results.

## Method and limitations

The FFT and spectrogram use windowed signal processing. Regime screening uses acoustic RMS, event density, spectral centroid, high-band energy, and spectral entropy. Mechanical event screening uses kurtosis, crest factor, RMS, and burst rate. These transparent rules are educational heuristics, not trained models or calibrated probabilities.

Acoustic signatures depend on sensor coupling, material, geometry, fluid, load, and acquisition chain. Boiling labels require apparatus-specific validation; crack-like events do not establish crack size, location, integrity, or remaining life. Validate against labeled experiments, known-good baselines, independent NDT, and qualified engineering review.
