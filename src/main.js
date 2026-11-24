import {
  analyzeSignal,
  DEFAULT_SAMPLE_RATE,
  DEMO_SCENARIOS,
  generateSample,
  SAMPLE_COUNT
} from "./signal.js";
import "./style.css";

const state = {
  raw: generateSample("nucleate"),
  sampleRate: DEFAULT_SAMPLE_RATE,
  scenario: "nucleate",
  fileName: "Demo · nucleate_boiling.csv",
  filter: "raw",
  page: "lab"
};
const app = document.querySelector("#app");

function render() {
  const analysis = analyzeSignal(state.raw, state.sampleRate, state.filter);
  app.innerHTML = `
    <div class="shell">
      <aside class="rail">
        <a class="brand" href="#" aria-label="AcousticSense home"><span class="brand-glyph">A<span>·</span></span><span>acoustic<span class="brand-soft">sense</span></span></a>
        <div class="rail-label">SIGNAL STUDIO</div>
        <nav class="rail-nav" aria-label="Main navigation">
          ${navButton("lab", "◫", "Signal lab")}
          ${navButton("regimes", "◉", "Boiling regimes")}
          ${navButton("events", "⌁", "Fault events")}
          ${navButton("dataset", "▤", "Dataset")}
        </nav>
        <div class="rail-bottom"><div class="privacy-lock">⌑</div><b>Private by design</b><small>Signals stay on this device.</small><span class="rail-version">AS / 01</span></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="breadcrumb">RESEARCH WORKSPACE <span>/</span> ACOUSTIC EMISSION</div><div class="topbar-actions"><span class="local-status"><i></i> LOCAL ANALYSIS</span><button class="download-report" id="report-button" title="Export analysis report">↧ <span>Export report</span></button><span class="user-mark">AS</span></div></header>
        <div class="page">
          <section class="intro"><div><div class="kicker"><span class="kicker-line"></span> NON-INVASIVE CONDITION INTELLIGENCE <span class="kicker-line"></span> 01</div><h1>Listen closer.<em>Know sooner.</em></h1><p class="intro-copy">A practical signal lab for acoustic emissions from thermal and mechanical systems.</p></div><div class="intro-index"><span>FIELD NOTES</span><b>VOL. 01</b><i>Thermal · Mechanical</i></div></section>
          <section class="control-strip"><div class="source-block"><span class="source-icon">◈</span><div><label for="scenario-select">SOURCE / SCENARIO</label><select id="scenario-select"><option value="" ${state.scenario ? "" : "selected"} disabled>Imported signal</option>${DEMO_SCENARIOS.map((option) => `<option value="${option.id}" ${state.scenario === option.id ? "selected" : ""}>${option.name}</option>`).join("")}</select></div><small>${escapeHtml(DEMO_SCENARIOS.find((item) => item.id === state.scenario)?.note || "Choose a demo or import a waveform")}</small></div><span class="control-rule"></span><div class="control-block"><label for="sample-rate">SAMPLE RATE</label><div class="input-unit"><input id="sample-rate" type="number" min="1" max="20000000" value="${state.sampleRate}" /><span>Hz</span></div></div><span class="control-rule"></span><div class="control-block filter-block"><label for="filter-select">NOISE FILTER</label><select id="filter-select"><option value="raw" ${state.filter === "raw" ? "selected" : ""}>Unfiltered</option><option value="bandpass" ${state.filter === "bandpass" ? "selected" : ""}>Band-pass · 350–3500 Hz</option><option value="lowpass" ${state.filter === "lowpass" ? "selected" : ""}>Low-pass · 1800 Hz</option><option value="notch60" ${state.filter === "notch60" ? "selected" : ""}>Mains notch · 60 Hz</option></select></div><span class="control-spacer"></span><button class="upload-button" id="upload-trigger"><span>＋</span> Import signal</button><input id="file-input" type="file" accept=".csv,.wav,.wave,text/csv,audio/wav" hidden /></section>
          <section class="source-line"><span class="record-dot"></span><b>${escapeHtml(state.fileName)}</b><span>·</span><span>${analysis.sampleCount.toLocaleString()} samples</span><span>·</span><span>${(analysis.features.duration * 1000).toFixed(0)} ms capture</span><span class="source-line-spacer"></span><span class="source-chip">${state.scenario ? "SYNTHETIC DATA" : "UPLOADED CAPTURE"}</span></section>
          <div class="tabs" role="tablist">${tab("lab", "Signal overview")}${tab("regimes", "Boiling regime")}${tab("events", "Fault screening")}${tab("dataset", "Data & method")}</div>
          ${renderView(analysis)}
          <footer class="footer"><span>ACOUSTICSENSE <b>·</b> SIGNAL PROCESSING NOTEBOOK</span><span>LOCAL-FIRST · EDUCATIONAL PROTOTYPE</span></footer>
        </div>
      </main>
    </div>`;
  drawSpectrogram(analysis);
  bindEvents(analysis);
}

function renderView(a) {
  if (state.page === "regimes") return renderRegimes(a);
  if (state.page === "events") return renderEvents(a);
  if (state.page === "dataset") return renderDataset(a);
  return renderLab(a);
}

function renderLab(a) {
  return `<div class="section-head"><div><h2>Signal at a glance</h2><p>Processed capture · ${labelForFilter(state.filter)}</p></div><span class="classification-pill ${a.fault.severity}"><i></i>${escapeHtml(a.fault.label)}</span></div>
    <div class="metric-row">
      ${metric("RMS amplitude", a.features.rms.toFixed(3), "signal units", "↗")}
      ${metric("Crest factor", a.features.crestFactor.toFixed(2), "peak / RMS", "⌁")}
      ${metric("Spectral centroid", a.features.centroid.toFixed(0), "Hz", "◌")}
      ${metric("Transient bursts", a.features.burstCount, `${a.features.burstRate.toFixed(1)} / sec`, "✳")}
    </div>
    <div class="analysis-grid"><article class="card waveform-card"><div class="card-heading"><div><span class="card-index">01 / TIME</span><h3>Acoustic waveform</h3></div><span class="unit-label">AMPLITUDE · A.U.</span></div>${lineChart(a.samples, a.sampleRate, "time")}<div class="chart-footer"><span>Duration <b>${a.features.duration.toFixed(2)} s</b></span><span>Peak <b>${a.features.peak.toFixed(3)} a.u.</b></span><span>Decimated view · full resolution analyzed</span></div></article>
    <article class="card spectrum-card"><div class="card-heading"><div><span class="card-index">02 / FREQUENCY</span><h3>FFT fingerprint</h3></div><span class="unit-label">HANN · SINGLE-SIDED</span></div>${spectrumChart(a.spectrum, a.sampleRate)}<div class="chart-footer"><span>Resolution <b>${a.features.resolutionHz.toFixed(2)} Hz</b></span><span>High-band energy <b>${(a.features.highFrequencyRatio * 100).toFixed(1)}%</b></span></div></article></div>
    <div class="analysis-grid lower-analysis"><article class="card spectrogram-card"><div class="card-heading"><div><span class="card-index">03 / TIME × FREQUENCY</span><h3>Spectrogram</h3></div><div class="spectrogram-legend"><span>LOW ENERGY</span><i></i><i></i><i></i><i></i><span>HIGH</span></div></div><div class="spectrogram-wrap"><canvas id="spectrogram" aria-label="Acoustic signal spectrogram"></canvas><div class="spectrogram-axis"><span>0 Hz</span><span>${Math.round(Math.min(4000, a.sampleRate / 2))} Hz</span></div></div></article>
    <article class="card diagnosis-card"><div class="card-heading"><div><span class="card-index">04 / INTERPRETATION</span><h3>Signal reading</h3></div><span class="signal-star">✳</span></div><div class="reading-label">BOILING SIGNATURE</div><div class="regime-title">${escapeHtml(a.boiling.regime)}</div><p class="reading-copy">${escapeHtml(a.boiling.reason)}</p><div class="confidence-track"><span>Heuristic match</span><b>${Math.round(a.boiling.confidence * 100)}%</b></div><div class="track"><i style="width:${a.boiling.confidence * 100}%"></i></div><div class="fault-divider"></div><div class="fault-summary"><span class="fault-orb ${a.fault.severity}">${a.fault.severity === "normal" ? "✓" : "!"}</span><div><b>${escapeHtml(a.fault.label)}</b><small>${escapeHtml(a.fault.reason)}</small></div></div><button class="inline-link" data-nav="events">Review screening notes <span>↗</span></button></article></div>
    <p class="caveat">Acoustic emission signatures depend on sensor coupling, material, geometry, fluid, load and acquisition chain. Regime labels are heuristic screening cues, not a validated classifier or a substitute for inspection.</p>`;
}

function renderRegimes(a) {
  const bars = [
    { name: "RMS energy", value: Math.min(100, a.features.rms * 100), display: a.features.rms.toFixed(3) },
    { name: "Event density", value: Math.min(100, a.features.burstRate * 1.5), display: `${a.features.burstRate.toFixed(1)} /s` },
    { name: "Spectral spread", value: a.features.spectralEntropy * 100, display: `${(a.features.spectralEntropy * 100).toFixed(0)}%` },
    { name: "High-band share", value: a.features.highFrequencyRatio * 100, display: `${(a.features.highFrequencyRatio * 100).toFixed(1)}%` }
  ];
  return `<div class="detail-intro"><div><div class="kicker">THERMAL SYSTEMS <span class="kicker-line"></span> ACOUSTIC REGIME MAP</div><h2>What is the boiling surface telling you?</h2><p>Compare a capture with a quiet baseline and inspect the features behind the regime cue.</p></div><span class="method-stamp">RULES · V1.0</span></div>
    <div class="regime-layout"><article class="card regime-result"><div class="result-orbit"><div class="orbit-ring"></div><div class="orbit-center"><span>AE</span><small>CAPTURE</small></div><i class="orbit-dot"></i></div><div class="result-copy"><span class="result-eyebrow">MOST LIKELY SIGNATURE</span><h3>${escapeHtml(a.boiling.regime)}</h3><p>${escapeHtml(a.boiling.reason)}</p><div class="result-confidence"><span>Heuristic confidence</span><b>${Math.round(a.boiling.confidence * 100)}%</b></div><div class="confidence-track large"><i style="width:${a.boiling.confidence * 100}%"></i></div><small>Confidence indicates feature-rule agreement only; it is not a calibrated probability.</small></div></article>
    <article class="card feature-panel"><div class="card-heading"><div><span class="card-index">FEATURE CONTRIBUTIONS</span><h3>Why this label?</h3></div><span class="feature-count">04 FEATURES</span></div>${bars.map((bar) => `<div class="feature-bar"><div><span>${bar.name}</span><b>${bar.display}</b></div><div class="track"><i style="width:${bar.value}%"></i></div></div>`).join("")}<div class="feature-note"><span>i</span><p>Rules are explicit and inspectable. Thresholds must be calibrated for the apparatus and sensor before operational use.</p></div></article></div>
    <div class="regime-reference"><div class="reference-heading"><div><span class="card-index">REFERENCE STATES</span><h3>Acoustic patterns to compare</h3></div><span>Illustrative signatures · not universal limits</span></div><div class="state-grid">${referenceState("01", "Quiet baseline", "Low RMS · sparse events", "pale")}${referenceState("02", "Nucleate-like", "Moderate events · rising broadband", "green")}${referenceState("03", "Transition-like", "Dense bursts · broad spectrum", "amber")}${referenceState("04", "Film-like", "Lower centroid · muted high band", "blue")}</div></div>
    <p class="caveat">Boiling-regime acoustics vary with pressure, fluid, heater geometry, sensor path and saturation conditions. Validate labels against independent instrumentation and expert-labeled experiments.</p>`;
}

function renderEvents(a) {
  const isFlag = a.fault.severity !== "normal";
  return `<div class="detail-intro"><div><div class="kicker">MECHANICAL SYSTEMS <span class="kicker-line"></span> IMPACT SCREENING</div><h2>Find the events hiding in the noise.</h2><p>Screen acoustic-emission captures for impulsive crack-like signatures and repetitive contact events.</p></div><span class="method-stamp">KURTOSIS · CREST · BURST RATE</span></div>
    <div class="event-layout"><article class="card event-result"><div class="event-status ${a.fault.severity}"><span class="event-status-icon">${isFlag ? "!" : "✓"}</span><div><span>SCREENING RESULT</span><b>${escapeHtml(a.fault.label)}</b></div><i>${isFlag ? "REVIEW" : "NOMINAL"}</i></div><p class="event-explanation">${escapeHtml(a.fault.reason)}</p><div class="event-features"><div><span>KURTOSIS</span><b>${a.features.kurtosis.toFixed(2)}</b><small>${a.features.kurtosis > 8 ? "Impulsive" : "Near Gaussian"}</small></div><div><span>CREST FACTOR</span><b>${a.features.crestFactor.toFixed(2)}</b><small>${a.features.crestFactor > 5 ? "High peakiness" : "Moderate peaks"}</small></div><div><span>BURST RATE</span><b>${a.features.burstRate.toFixed(1)}<small> / sec</small></b><small>${a.features.burstCount} detected events</small></div></div><div class="event-timeline">${eventTimeline(a.samples, a.sampleRate)}</div><div class="timeline-labels"><span>0.00 s</span><span>${a.features.duration.toFixed(2)} s</span></div></article>
    <article class="card response-panel"><span class="card-index">ENGINEERING FOLLOW-UP</span><h3>${isFlag ? "Confirm before you conclude." : "Keep building a baseline."}</h3><p>${isFlag ? "A transient screen is not a crack diagnosis. Re-capture under known load and compare the event pattern with a reference signal." : "Quiet signals are most useful when collected consistently. Repeat at the same sensor location, gain and operating condition."}</p><div class="response-steps"><div><i>01</i><span><b>Check the acquisition chain</b><small>Sensor mount, couplant, gain, clipping and cable noise.</small></span></div><div><i>02</i><span><b>Repeat under controlled conditions</b><small>Keep machine load and sensor position comparable.</small></span></div><div><i>03</i><span><b>Escalate with evidence</b><small>Confirm suspected defects with qualified NDT / vibration review.</small></span></div></div></article></div>
    <div class="card method-strip"><span class="method-icon">⌁</span><div><b>How screening works</b><p>Signal kurtosis measures impulsiveness; crest factor compares peak and RMS; burst rate counts threshold crossings in short energy frames. Transparent rules identify patterns for review, not defect certainty.</p></div><button class="inline-link" data-nav="lab">View signal lab <span>↗</span></button></div>
    <p class="caveat">This prototype does not determine crack size, location, structural integrity or remaining life. Use validated NDT procedures and qualified engineering judgment for asset disposition.</p>`;
}

function renderDataset(a) {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === state.scenario);
  return `<div class="detail-intro"><div><div class="kicker">DATA NOTEBOOK <span class="kicker-line"></span> LOCAL FILES</div><h2>Bring a signal. Leave with evidence.</h2><p>AcousticSense analyzes a local waveform and keeps source data in your browser.</p></div><button class="dark-button" id="upload-again">＋ Import signal</button></div>
    <div class="dataset-layout"><article class="card dataset-card"><div class="card-heading"><div><span class="card-index">ACTIVE CAPTURE</span><h3>${escapeHtml(state.fileName)}</h3></div><span class="ready-tag"><i></i> IN MEMORY</span></div><div class="dataset-metrics"><div><span>POINTS</span><b>${a.sampleCount.toLocaleString()}</b></div><div><span>RATE</span><b>${a.sampleRate.toLocaleString()}<small> Hz</small></b></div><div><span>DURATION</span><b>${a.features.duration.toFixed(2)}<small> s</small></b></div><div><span>FILTER</span><b>${labelForFilter(state.filter)}</b></div></div><div class="dataset-note"><span>◈</span><div><b>${state.scenario ? `Demo scenario · ${scenario?.name || "Uploaded signal"}` : "Uploaded capture"}</b><small>${state.scenario ? `${scenario?.note || ""}. Synthetic waveform generated locally for interface testing.` : "Source waveform parsed locally in this browser."}</small></div></div><div class="dataset-actions"><button class="outline-button" id="download-sample">Download waveform CSV <span>↓</span></button><button class="text-button" id="load-default">Reset to nucleate sample ↻</button></div></article>
    <aside class="card format-card"><div class="format-icon">↧</div><h3>Signal input guide</h3><p>Import a WAV recording or a CSV amplitude series. CSV should contain one signal value per row; the first numeric column is used if no header is recognized.</p><div class="format-label">SUPPORTED</div><code>.wav · PCM audio</code><code>.csv · signal / ae / voltage</code><div class="format-label">BEFORE ANALYSIS</div><ul><li>Set the sensor sample rate accurately.</li><li>Check for clipping and offset.</li><li>Choose a filter only to reduce known noise.</li><li>Compare against a matched baseline.</li></ul><div class="privacy-note"><span>⌑</span><small>No upload endpoint. Files are read in memory and never sent to a server.</small></div></aside></div>
    <div class="dataset-callout"><span class="callout-glyph">✳</span><div><b>Need a dataset? Start with a scenario.</b><p>Six reproducible synthetic signals let you explore boiling-like signatures, impacts, bearing resonance and quiet reference conditions before importing your own capture.</p></div><button class="inline-link" data-nav="lab">Explore scenarios <span>↗</span></button></div>
    <p class="caveat">Synthetic examples are designed to exercise the interface, not to represent validated material, boiling or machine response.</p>`;
}

function metric(title, value, unit, symbol) {
  return `<article class="metric"><div class="metric-top"><span>${title}</span><i>${symbol}</i></div><div class="metric-value">${value}<small>${unit}</small></div></article>`;
}

function referenceState(number, name, note, color) {
  return `<div class="reference-state"><span class="reference-number">${number}</span><i class="state-swatch ${color}"></i><div><b>${name}</b><small>${note}</small></div><span class="reference-arrow">↗</span></div>`;
}

function lineChart(samples, sampleRate, type) {
  const points = 500;
  const stride = Math.max(1, Math.floor(samples.length / points));
  const values = [];
  for (let index = 0; index < samples.length; index += stride) values.push(samples[index]);
  const peak = Math.max(0.1, ...values.map(Math.abs));
  const width = 720;
  const height = 180;
  const pad = { left: 36, right: 12, top: 12, bottom: 26 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const path = values.map((value, index) => {
    const x = pad.left + index / Math.max(1, values.length - 1) * plotWidth;
    const y = pad.top + (1 - (value / peak + 1) / 2) * plotHeight;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const duration = samples.length / sampleRate;
  return `<div class="chart-area"><svg viewBox="0 0 ${width} ${height}" class="line-chart" role="img" aria-label="Acoustic signal time waveform">
    ${[-1, -0.5, 0, 0.5, 1].map((fraction) => { const y = pad.top + (1 - (fraction + 1) / 2) * plotHeight; return `<line class="grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text class="axis-label" x="${pad.left - 7}" y="${y + 3}" text-anchor="end">${(fraction * peak).toFixed(2)}</text>`; }).join("")}
    <path d="${path}" class="wave-path"/>
    ${[0, 0.5, 1].map((fraction) => `<text class="axis-label" x="${pad.left + fraction * plotWidth}" y="${height - 5}" text-anchor="${fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}">${(duration * fraction).toFixed(2)} s</text>`).join("")}
    </svg></div>`;
}

function spectrumChart(bins, sampleRate) {
  const maxFrequency = Math.min(4000, sampleRate / 2);
  const visible = bins.filter((bin) => bin.frequency <= maxFrequency);
  const width = 520;
  const height = 180;
  const pad = { left: 37, right: 12, top: 14, bottom: 26 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(0.001, visible.reduce((value, bin) => Math.max(value, bin.amplitude), 0)) * 1.08;
  const stride = Math.max(1, Math.floor(visible.length / 360));
  const display = visible.filter((_, index) => index % stride === 0);
  const path = display.map((bin, index) => {
    const x = pad.left + (bin.frequency / maxFrequency) * plotWidth;
    const y = pad.top + (1 - bin.amplitude / max) * plotHeight;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<div class="chart-area"><svg viewBox="0 0 ${width} ${height}" class="line-chart spectrum-line" role="img" aria-label="Frequency spectrum">
    ${[0, 0.5, 1].map((fraction) => { const y = pad.top + fraction * plotHeight; return `<line class="grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text class="axis-label" x="${pad.left - 7}" y="${y + 3}" text-anchor="end">${(max * (1 - fraction)).toFixed(2)}</text>`; }).join("")}
    <path d="${path}" class="spectrum-path"/>
    ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => `<text class="axis-label" x="${pad.left + fraction * plotWidth}" y="${height - 5}" text-anchor="${fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}">${Math.round(maxFrequency * fraction)} Hz</text>`).join("")}
    </svg></div>`;
}

function eventTimeline(samples, sampleRate) {
  const block = Math.max(1, Math.floor(samples.length / 250));
  const rms = [];
  for (let start = 0; start < samples.length; start += block) {
    let energy = 0;
    for (let index = start; index < Math.min(samples.length, start + block); index += 1) energy += samples[index] ** 2;
    rms.push(Math.sqrt(energy / Math.min(block, samples.length - start)));
  }
  const max = Math.max(0.001, ...rms);
  return `<div class="timeline-bars" aria-label="Signal energy timeline">${rms.map((value, index) => `<i class="${value / max > 0.62 ? "event-high" : ""}" style="height:${Math.max(4, value / max * 100)}%" title="${(index * block / sampleRate).toFixed(3)} s · ${value.toFixed(3)} a.u."></i>`).join("")}</div>`;
}

function drawSpectrogram(analysis) {
  const canvas = app.querySelector("#spectrogram");
  if (!canvas) return;
  const { frames, sampleRate } = analysis.spectrogram;
  const width = 720;
  const height = 200;
  const frequencyLimit = Math.min(frames[0].length, Math.ceil(4000 * analysis.spectrogram.windowSize / sampleRate));
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(devicePixelRatio, devicePixelRatio);
  let max = 0;
  for (const frame of frames) for (let bin = 0; bin < frequencyLimit; bin += 1) max = Math.max(max, frame[bin]);
  const image = context.createImageData(width, height);
  for (let x = 0; x < width; x += 1) {
    const frame = frames[Math.floor(x / width * frames.length)];
    for (let y = 0; y < height; y += 1) {
      const bin = frequencyLimit - 1 - Math.floor(y / height * frequencyLimit);
      const value = Math.max(0, Math.min(1, Math.log10(1 + frame[bin] * 100) / Math.log10(1 + Math.max(max, 1e-9) * 100)));
      const [red, green, blue] = spectrogramColor(value);
      const offset = (y * width + x) * 4;
      image.data[offset] = red;
      image.data[offset + 1] = green;
      image.data[offset + 2] = blue;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function spectrogramColor(value) {
  const stops = [[24, 42, 52], [49, 90, 99], [89, 143, 142], [187, 184, 142], [239, 218, 172]];
  const position = value * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const mix = position - index;
  return stops[index].map((channel, i) => Math.round(channel + (stops[index + 1][i] - channel) * mix));
}

function navButton(id, icon, label) {
  return `<button class="rail-item ${state.page === id ? "active" : ""}" data-nav="${id}"><span>${icon}</span>${label}</button>`;
}

function tab(id, label) {
  return `<button class="tab ${state.page === id ? "active" : ""}" role="tab" aria-selected="${state.page === id}" data-nav="${id}">${label}</button>`;
}

function bindEvents(analysis) {
  app.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.nav;
    render();
  }));
  app.querySelector("#scenario-select")?.addEventListener("change", (event) => {
    state.scenario = event.target.value;
    state.raw = generateSample(state.scenario, SAMPLE_COUNT, state.sampleRate);
    state.fileName = `Demo · ${state.scenario}_signal.csv`;
    render();
  });
  app.querySelector("#sample-rate")?.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0 || value > 20_000_000) {
      showToast("Sample rate must be between 1 Hz and 20 MHz.", true);
      return;
    }
    if ((state.filter === "bandpass" && value <= 7000) || (state.filter === "notch60" && value <= 120)) {
      state.filter = "raw";
      showToast("Filter reset: the selected sample rate is below that filter's valid range.");
    }
    state.sampleRate = value;
    render();
  });
  app.querySelector("#filter-select")?.addEventListener("change", (event) => {
    const previous = state.filter;
    state.filter = event.target.value;
    try {
      render();
    } catch (error) {
      state.filter = previous;
      render();
      showToast(error.message, true);
    }
  });
  app.querySelector("#upload-trigger")?.addEventListener("click", () => app.querySelector("#file-input").click());
  app.querySelector("#upload-again")?.addEventListener("click", () => app.querySelector("#file-input").click());
  app.querySelector("#file-input")?.addEventListener("change", handleUpload);
  app.querySelector("#report-button")?.addEventListener("click", () => downloadReport(analysis));
  app.querySelector("#download-sample")?.addEventListener("click", () => download(sampleCsv(state.raw, state.sampleRate), "acousticsense-capture.csv", "text/csv"));
  app.querySelector("#load-default")?.addEventListener("click", () => {
    state.scenario = "nucleate";
    state.raw = generateSample("nucleate", SAMPLE_COUNT, state.sampleRate);
    state.fileName = "Demo · nucleate_boiling.csv";
    state.filter = "raw";
    render();
  });
}

async function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 80_000_000) throw new Error("Choose a signal file under 80 MB.");
    if (/\.wav$/i.test(file.name) || file.type === "audio/wav" || file.type === "audio/x-wav") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("WAV decoding is not supported in this browser.");
      const context = new AudioContextClass();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      if (decoded.length > 2_000_000) {
        await context.close();
        throw new Error("WAV contains more than 2 million samples; select a shorter capture.");
      }
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel));
      const samples = new Float64Array(decoded.length);
      for (let index = 0; index < decoded.length; index += 1) {
        samples[index] = channels.reduce((sum, channel) => sum + channel[index], 0) / channels.length;
      }
      state.raw = samples;
      state.sampleRate = decoded.sampleRate;
      state.scenario = "";
      state.fileName = file.name;
      state.filter = "raw";
      await context.close();
    } else {
      const parsed = parseCsv(await file.text());
      state.raw = parsed.samples;
      state.sampleRate = parsed.sampleRate || state.sampleRate;
      state.scenario = "";
      state.fileName = file.name;
      state.filter = "raw";
    }
    state.page = "lab";
    render();
    showToast(`Loaded ${state.raw.length.toLocaleString()} samples from ${file.name}`);
  } catch (error) {
    showToast(error.message, true);
  }
  event.target.value = "";
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one sample.");
  const firstRow = lines[0].split(",");
  const firstRowIsHeader = firstRow.some((value) => !Number.isFinite(Number(value.trim())));
  const headers = firstRow.map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const signalHeaders = ["signal", "amplitude", "ae", "voltage", "sample", "acoustic_emission"];
  const signalIndex = headers.findIndex((header) => signalHeaders.includes(header));
  const rateIndex = headers.findIndex((header) => ["sample_rate_hz", "sample_rate", "sampling_rate"].includes(header));
  const fallbackIndex = headers.findIndex((header) => !["sample_rate_hz", "sample_rate", "sampling_rate", "timestamp", "time"].includes(header));
  const values = [];
  for (let rowIndex = firstRowIsHeader ? 1 : 0; rowIndex < lines.length; rowIndex += 1) {
    const row = lines[rowIndex].split(",");
    const candidate = signalIndex >= 0 ? row[signalIndex] : fallbackIndex >= 0 ? row[fallbackIndex] : row.find((value) => value.trim() !== "");
    if (candidate === undefined || candidate.trim() === "") continue;
    const number = Number(candidate);
    if (!Number.isFinite(number)) throw new Error(`Invalid signal value on CSV row ${rowIndex + 1}.`);
    values.push(number);
    if (values.length > 2_000_000) throw new Error("CSV contains more than 2 million samples; select a shorter capture.");
  }
  if (values.length < 32) throw new Error("At least 32 numeric signal samples are required.");
  const sampleRate = rateIndex >= 0 ? Number(lines[1].split(",")[rateIndex]) : undefined;
  if (rateIndex >= 0 && (!Number.isFinite(sampleRate) || sampleRate <= 0)) throw new Error("CSV sample_rate_hz must be a positive number.");
  return { samples: Float64Array.from(values), sampleRate };
}

function sampleCsv(samples, rate) {
  const lines = ["sample_rate_hz,signal"];
  for (const value of samples) lines.push(`${rate},${value.toFixed(7)}`);
  return lines.join("\n");
}

function downloadReport(analysis) {
  const report = {
    generatedAt: new Date().toISOString(),
    source: state.fileName,
    sampleRateHz: analysis.sampleRate,
    sampleCount: analysis.sampleCount,
    durationSeconds: Number(analysis.features.duration.toFixed(4)),
    filter: labelForFilter(analysis.filter),
    signalFeatures: Object.fromEntries(Object.entries(analysis.features).map(([key, value]) => [key, Number.isFinite(value) ? Number(value.toFixed(5)) : value])),
    boilingScreen: analysis.boiling,
    faultScreen: analysis.fault,
    caveat: "Heuristic educational screening only. Validate against calibrated sensors, known baselines, and qualified engineering review."
  };
  download(JSON.stringify(report, null, 2), "acousticsense-analysis-report.json", "application/json");
}

function download(content, name, mimeType) {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function labelForFilter(filter) {
  return { raw: "Unfiltered", bandpass: "350–3500 Hz band-pass", lowpass: "1800 Hz low-pass", notch60: "60 Hz notch" }[filter] || filter;
}

function showToast(message, error = false) {
  app.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${error ? "toast-error" : ""}`;
  toast.setAttribute("role", error ? "alert" : "status");
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

render();
