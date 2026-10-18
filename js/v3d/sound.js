/* VELLURE · ambiente sonoro gerado (sem arquivos de áudio) */
let ctx = null, master = null, on = false;

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.4;
  const delay = ctx.createDelay(2); delay.delayTime.value = 0.42;
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  delay.connect(fb); fb.connect(delay);
  lp.connect(master); lp.connect(delay); delay.connect(master); master.connect(ctx.destination);
  // acorde suave (Ré maior com 9ª), cada voz respirando em ritmo próprio
  [146.83, 220, 277.18, 329.63, 440].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 2) * 4;
    const g = ctx.createGain(); g.gain.value = 0.0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.023;
    const lg = ctx.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(g.gain);
    const base = ctx.createConstantSource ? ctx.createConstantSource() : null;
    if (base) { base.offset.value = 0.04; base.connect(g.gain); base.start(); }
    o.connect(g); g.connect(lp); o.start(); lfo.start();
  });
}

export const sound = {
  get on() { return on; },
  toggle() {
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    on = !on;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, on ? 1.2 : 0.4);
    return on;
  },
  chime(pitch = 1) {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    [1, 1.5, 2.01].forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880 * pitch * m;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 / (i + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.5);
    });
  }
};
