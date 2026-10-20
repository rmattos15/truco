// Som sintetizado no navegador: não depende de arquivos ou serviços externos.
class TableAudio {
  constructor() { this.context = null; this.master = null; this.music = null; this.effects = null; this.enabled = false; this.musicVolume = 42; this.effectsEnabled = true; this.timer = null; this.nextBar = 0; this.bar = 0; }
  async enable() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.music = this.context.createGain(); this.effects = this.context.createGain();
      this.master.gain.value = 0.2; this.music.gain.value = this.musicVolume / 100; this.effects.gain.value = this.effectsEnabled ? 1 : 0.0001;
      this.music.connect(this.master); this.effects.connect(this.master); this.master.connect(this.context.destination);
    }
    await this.context.resume(); this.master.gain.setValueAtTime(0.2, this.context.currentTime); this.enabled = true; this.startMusic();
  }
  setMusicVolume(value) {
    this.musicVolume = value;
    if (!this.music || !this.context) return;
    if (value === 0) this.music.gain.setValueAtTime(0, this.context.currentTime);
    else this.music.gain.setTargetAtTime(value / 100, this.context.currentTime, 0.03);
  }
  setEffectsEnabled(enabled) { this.effectsEnabled = enabled; if (this.effects && this.context) this.effects.gain.setTargetAtTime(enabled ? 1 : 0.0001, this.context.currentTime, 0.02); }
  async toggle() { if (this.enabled) { this.enabled = false; this.master.gain.setValueAtTime(0.0001, this.context.currentTime); this.stopMusic(); return false; } await this.enable(); return true; }
  tone(frequency, at, duration, options = {}) {
    if (!this.enabled || !this.context) return;
    const { type = 'sine', volume = 0.1, attack = 0.01, release = 0.12 } = options;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + attack); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration + release);
    oscillator.connect(gain).connect(options.bus === 'music' ? this.music : this.effects); oscillator.start(at); oscillator.stop(at + duration + release + 0.02);
  }
  noise(at, duration, volume, options = {}) {
    if (!this.enabled || !this.context) return;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate); const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const source = this.context.createBufferSource(); const filter = this.context.createBiquadFilter(); const gain = this.context.createGain();
    filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.8; gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.buffer = buffer; source.connect(filter).connect(gain).connect(options.bus === 'music' ? this.music : this.effects); source.start(at); source.stop(at + duration);
  }
  card() { const now = this.context?.currentTime ?? 0; this.noise(now, 0.055, 0.11); this.tone(360, now, 0.035, { type: 'triangle', volume: 0.06, release: 0.04 }); }
  yourTurn() { const now = this.context?.currentTime ?? 0; this.tone(587.33, now, 0.07, { volume: 0.14 }); this.tone(783.99, now + 0.1, 0.1, { volume: 0.12 }); }
  truco() { const now = this.context?.currentTime ?? 0; [196, 246.94, 293.66].forEach((note, i) => this.tone(note, now + i * 0.075, 0.13, { type: 'square', volume: 0.09 })); }
  roundEnd(won) { const now = this.context?.currentTime ?? 0; (won ? [523.25, 659.25, 783.99] : [392, 329.63, 261.63]).forEach((note, i) => this.tone(note, now + i * 0.12, 0.18, { type: 'triangle', volume: 0.12, release: 0.2 })); }
  startMusic() { if (this.timer || !this.enabled) return; this.nextBar = this.context.currentTime + 0.08; this.scheduleMusic(); this.timer = window.setInterval(() => this.scheduleMusic(), 850); }
  stopMusic() { window.clearInterval(this.timer); this.timer = null; }
  scheduleMusic() {
    if (!this.enabled || !this.context) return;
    const beat = 60 / 92; const chords = [[261.63, 311.13, 392, 466.16], [293.66, 349.23, 440, 523.25], [329.63, 392, 493.88, 587.33], [220, 261.63, 329.63, 392]];
    while (this.nextBar < this.context.currentTime + 1.6) {
      const chord = chords[this.bar % chords.length];
      [0, 2].forEach((step) => chord.slice(1).forEach((note) => this.tone(note, this.nextBar + step * beat, beat * 0.62, { volume: 0.018, attack: 0.025, release: 0.18, bus: 'music' })));
      [0, 1.5, 2, 3.5].forEach((step) => this.tone(chord[0] / 2, this.nextBar + step * beat, beat * 0.38, { type: 'triangle', volume: 0.035, bus: 'music' }));
      [1, 3].forEach((step) => this.noise(this.nextBar + step * beat, 0.045, 0.012, { bus: 'music' })); this.nextBar += beat * 4; this.bar += 1;
    }
  }
}
export const audio = new TableAudio();
