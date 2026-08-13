const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export function createAmbientEngine() {
  let context;
  let master;
  let interval;
  let started = false;
  let muted = false;
  const voices = [];

  const createVoice = (frequency, volume, detune) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const drift = context.createOscillator();
    const driftDepth = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    gain.gain.value = volume;
    filter.type = "lowpass";
    filter.frequency.value = 820;
    drift.type = "sine";
    drift.frequency.value = 0.025 + Math.random() * 0.025;
    driftDepth.gain.value = 3.5;

    drift.connect(driftDepth).connect(oscillator.detune);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start();
    drift.start();
    voices.push({ oscillator, gain, drift });
  };

  const breathe = () => {
    if (!context) return;
    const time = context.currentTime;
    voices.forEach(({ gain }, index) => {
      const base = [0.036, 0.021, 0.014, 0.008][index];
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), time);
      gain.gain.linearRampToValueAtTime(base * 0.55, time + 5);
      gain.gain.linearRampToValueAtTime(base, time + 14);
      gain.gain.linearRampToValueAtTime(base * 0.72, time + 24);
    });
  };

  return {
    async start() {
      if (!AudioContextClass) return;
      if (!context) {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);

        [73.42, 110, 146.83, 220].forEach((frequency, index) => {
          createVoice(frequency, [0.036, 0.021, 0.014, 0.008][index], index % 2 ? 4 : -4);
        });

        const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
        const channel = buffer.getChannelData(0);
        let last = 0;
        for (let index = 0; index < channel.length; index += 1) {
          const white = Math.random() * 2 - 1;
          last = last * 0.985 + white * 0.015;
          channel[index] = last * 0.4;
        }
        const noise = context.createBufferSource();
        const noiseFilter = context.createBiquadFilter();
        const noiseGain = context.createGain();
        noise.buffer = buffer;
        noise.loop = true;
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.value = 480;
        noiseGain.gain.value = 0.018;
        noise.connect(noiseFilter).connect(noiseGain).connect(master);
        noise.start();

        breathe();
        interval = window.setInterval(breathe, 24_000);
      }

      if (context.state === "suspended") await context.resume();
      const time = context.currentTime;
      master.gain.cancelScheduledValues(time);
      master.gain.setValueAtTime(master.gain.value, time);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.76, time + 2.8);
      started = true;
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (!master || !context || !started) return;
      const time = context.currentTime;
      master.gain.cancelScheduledValues(time);
      master.gain.setValueAtTime(master.gain.value, time);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.76, time + 0.45);
    },
    destroy() {
      if (interval) window.clearInterval(interval);
      context?.close();
      context = undefined;
    },
  };
}
