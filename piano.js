// The little piano on the cover: a tiny synth in the browser (saw + square + sub through a
// filter with an envelope, into a dark delay), playable with mouse, touch or the computer
// keyboard, plus a "repeat the melody" game.
//
//   const desmontar = SDCPiano.montar(container, { onNote });
(function () {
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const NOMBRES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

  // Same layout as the plugin's computer keyboard: A W S E D F T G Y H U J K O L P, plus Ñ.
  const TECLAS = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH",
                  "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP", "Semicolon"];
  const LETRAS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", "ñ"];

  const RANGO = 24;         // semitones shown: two octaves (+ the top C)
  const BASE_MIN = 36;
  const BASE_MAX = 72;
  // Notes the game picks from (major pentatonic), so every melody sounds musical.
  const PENTATONICA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // ---------- sound ----------
  let audio = null;

  const motor = () => {
    if (audio) {
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      return audio;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(comp);

    // A short, dark feedback delay: the "room" the piano is in.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.31;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const oscuro = ctx.createBiquadFilter();
    oscuro.type = "lowpass";
    oscuro.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    master.connect(delay);
    delay.connect(oscuro);
    oscuro.connect(feedback);
    feedback.connect(delay);
    oscuro.connect(wet);
    wet.connect(comp);

    audio = { ctx, master, voces: new Map() };
    return audio;
  };

  const noteOn = (midi) => {
    const { ctx, master, voces } = motor();
    if (voces.has(midi)) noteOff(midi, true);
    const t = ctx.currentTime;

    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 5;
    // The filter opens on the attack and settles: the plugin's "Env. Filtro".
    filtro.frequency.setValueAtTime(380, t);
    filtro.frequency.exponentialRampToValueAtTime(3200, t + 0.02);
    filtro.frequency.exponentialRampToValueAtTime(1100, t + 0.45);

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, t);
    vca.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    vca.gain.exponentialRampToValueAtTime(0.26, t + 0.35);
    filtro.connect(vca);
    vca.connect(master);

    const capas = [
      { tipo: "sawtooth", semis: 0, cents: 0, nivel: 0.5 },
      { tipo: "square", semis: 0, cents: 7, nivel: 0.22 },
      { tipo: "sine", semis: -12, cents: 0, nivel: 0.45 },
    ];
    const oscs = capas.map((c) => {
      const o = ctx.createOscillator();
      o.type = c.tipo;
      o.frequency.value = hz(midi + c.semis);
      o.detune.value = c.cents;
      const g = ctx.createGain();
      g.gain.value = c.nivel;
      o.connect(g);
      g.connect(filtro);
      o.start(t);
      return o;
    });

    voces.set(midi, { vca, oscs });
  };

  const noteOff = (midi, rapido) => {
    if (!audio) return;
    const v = audio.voces.get(midi);
    if (!v) return;
    audio.voces.delete(midi);
    const t = audio.ctx.currentTime;
    const release = rapido ? 0.015 : 0.14;
    v.vca.gain.cancelScheduledValues(t);
    v.vca.gain.setValueAtTime(Math.max(v.vca.gain.value, 0.0001), t);
    v.vca.gain.setTargetAtTime(0, t, release);
    for (const o of v.oscs) o.stop(t + release * 6);
  };

  const leerRecord = () => {
    try { return parseInt(localStorage.getItem("sdc-piano-record") || "0", 10) || 0; } catch (e) { return 0; }
  };
  const guardarRecord = (n) => {
    try { localStorage.setItem("sdc-piano-record", String(n)); } catch (e) { /* private mode: no record */ }
  };

  // ---------- the keyboard on screen ----------
  const montar = (container, opciones = {}) => {
    const onNote = opciones.onNote || (() => {});
    let base = 60;              // lowest note shown, and where the computer keyboard starts
    const sonando = new Map();  // midi -> how many things hold it (pointer, key)
    const porPuntero = new Map();
    const porTecla = new Map();
    const timers = [];

    const wrap = document.createElement("div");
    wrap.className = "piano-wrap";
    const piano = document.createElement("div");
    piano.className = "piano";
    piano.setAttribute("role", "group");
    piano.setAttribute("aria-label", "piano: tocá con el mouse, el dedo o el teclado");
    const pie = document.createElement("div");
    pie.className = "piano-pie mono";
    const ayuda = document.createElement("span");
    ayuda.className = "piano-ayuda";
    ayuda.textContent = "a w s e d f t g y h u j k o l p ñ · z / x octava";
    const octava = document.createElement("span");
    octava.className = "piano-octava";
    const jugar = document.createElement("button");
    jugar.className = "play piano-jugar";
    jugar.textContent = "jugar";
    const estado = document.createElement("span");
    estado.className = "piano-estado";
    pie.append(octava, ayuda, jugar, estado);
    wrap.append(piano, pie);
    container.appendChild(wrap);

    const teclas = new Map(); // midi -> element

    const dibujar = () => {
      piano.replaceChildren();
      teclas.clear();
      const blancas = [];
      for (let m = base; m <= base + RANGO; m++) if (!BLACK.has(m % 12)) blancas.push(m);
      const ancho = 100 / blancas.length;

      for (let m = base; m <= base + RANGO; m++) {
        const negra = BLACK.has(m % 12);
        const k = document.createElement("div");
        k.className = "tecla " + (negra ? "negra" : "blanca");
        k.dataset.midi = m;
        if (negra) {
          const antes = blancas.filter((b) => b < m).length; // white keys to its left
          k.style.left = (antes * ancho - ancho * 0.3) + "%";
          k.style.width = (ancho * 0.6) + "%";
        }
        const i = m - base;
        if (i < LETRAS.length) {
          const l = document.createElement("span");
          l.className = "tecla-letra";
          l.textContent = LETRAS[i];
          k.appendChild(l);
        }
        if (m % 12 === 0) {
          const n = document.createElement("span");
          n.className = "tecla-nombre";
          n.textContent = "c" + (Math.floor(m / 12) - 1);
          k.appendChild(n);
        }
        if (sonando.has(m)) k.classList.add("on");
        teclas.set(m, k);
        piano.appendChild(k);
      }
      octava.textContent = "oct " + (Math.floor(base / 12) - 1);
    };

    const pintar = (midi, on) => {
      const k = teclas.get(midi);
      if (k) k.classList.toggle("on", on);
    };

    // Several things can hold the same note (two fingers, a key and the mouse...);
    // it only stops when the last one lets go.
    const apretar = (midi) => {
      const n = sonando.get(midi) || 0;
      sonando.set(midi, n + 1);
      if (n === 0) {
        noteOn(midi);
        pintar(midi, true);
        onNote(midi);
        juego.entrada(midi);
      }
    };
    const soltar = (midi) => {
      const n = sonando.get(midi) || 0;
      if (n <= 1) {
        sonando.delete(midi);
        noteOff(midi);
        pintar(midi, false);
      } else {
        sonando.set(midi, n - 1);
      }
    };
    const soltarTodo = () => {
      for (const m of [...sonando.keys()]) { sonando.set(m, 1); soltar(m); }
      porPuntero.clear();
      porTecla.clear();
    };

    // ---------- mouse / touch: press, and slide across keys for a glissando ----------
    const teclaEn = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const k = e && e.closest(".tecla");
      return k && piano.contains(k) ? parseInt(k.dataset.midi, 10) : null;
    };
    const onDown = (e) => {
      const m = teclaEn(e.clientX, e.clientY);
      if (m === null) return;
      e.preventDefault();
      porPuntero.set(e.pointerId, m);
      apretar(m);
    };
    const onMove = (e) => {
      if (!porPuntero.has(e.pointerId)) return;
      const m = teclaEn(e.clientX, e.clientY);
      const antes = porPuntero.get(e.pointerId);
      if (m === antes) return;
      if (antes !== null) soltar(antes);
      porPuntero.set(e.pointerId, m);
      if (m !== null) apretar(m);
    };
    const onUp = (e) => {
      if (!porPuntero.has(e.pointerId)) return;
      const m = porPuntero.get(e.pointerId);
      porPuntero.delete(e.pointerId);
      if (m !== null) soltar(m);
    };
    piano.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    // ---------- computer keyboard ----------
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.code === "KeyZ" || e.code === "KeyX") {
        e.preventDefault();
        if (e.repeat) return;
        const nueva = Math.max(BASE_MIN, Math.min(BASE_MAX, base + (e.code === "KeyZ" ? -12 : 12)));
        if (nueva !== base) { base = nueva; dibujar(); }
        return;
      }
      const i = TECLAS.indexOf(e.code);
      if (i < 0) return;
      e.preventDefault();
      if (e.repeat || porTecla.has(e.code)) return;
      // Remember the note this key started, so changing octave mid-note can't strand it.
      const m = base + i;
      porTecla.set(e.code, m);
      apretar(m);
    };
    const onKeyUp = (e) => {
      if (!porTecla.has(e.code)) return;
      const m = porTecla.get(e.code);
      porTecla.delete(e.code);
      soltar(m);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", soltarTodo);

    // ---------- the game: repeat the melody, one note longer each round ----------
    const juego = (() => {
      let secuencia = [];
      let paso = 0;
      let modo = "libre"; // libre | escuchando | tu-turno
      let record = leerRecord();

      const decir = (texto) => { estado.textContent = texto; };
      const mostrarRecord = () => decir(record > 0 ? "récord: " + record : "");
      mostrarRecord();

      const later = (fn, ms) => timers.push(setTimeout(fn, ms));

      const tocarSecuencia = () => {
        modo = "escuchando";
        piano.classList.add("escuchando");
        decir("escuchá… ronda " + secuencia.length);
        secuencia.forEach((m, i) => {
          later(() => {
            noteOn(m);
            const k = teclas.get(m);
            if (k) k.classList.add("guia");
            onNote(m);
          }, 450 + i * 430);
          later(() => {
            noteOff(m);
            const k = teclas.get(m);
            if (k) k.classList.remove("guia");
          }, 450 + i * 430 + 300);
        });
        later(() => {
          modo = "tu-turno";
          paso = 0;
          piano.classList.remove("escuchando");
          decir("tu turno · ronda " + secuencia.length);
        }, 450 + secuencia.length * 430 + 100);
      };

      const notaNueva = () => base + PENTATONICA[Math.floor(Math.random() * PENTATONICA.length)];

      const empezar = () => {
        secuencia = [notaNueva(), notaNueva(), notaNueva()];
        jugar.textContent = "parar";
        tocarSecuencia();
      };

      const parar = (texto) => {
        timers.splice(0).forEach(clearTimeout);
        for (const k of teclas.values()) k.classList.remove("guia");
        piano.classList.remove("escuchando");
        modo = "libre";
        jugar.textContent = "jugar";
        if (texto) decir(texto); else mostrarRecord();
      };

      jugar.addEventListener("click", () => {
        motor(); // browsers only allow sound after a click
        if (modo === "libre") empezar(); else parar();
      });

      return {
        entrada(midi) {
          if (modo !== "tu-turno") return;
          if (midi !== secuencia[paso]) {
            const logradas = secuencia.length - 1 - 2; // rounds fully repeated before this one
            const puntos = Math.max(0, logradas);
            if (puntos > record) { record = puntos; guardarRecord(record); }
            piano.classList.add("error");
            later(() => piano.classList.remove("error"), 400);
            parar("se trabó · " + puntos + (puntos === 1 ? " ronda" : " rondas") + " · récord " + record);
            return;
          }
          paso++;
          if (paso === secuencia.length) {
            modo = "escuchando";
            decir("bien");
            secuencia.push(notaNueva());
            later(tocarSecuencia, 600);
          }
        },
        cortar: () => parar(),
      };
    })();

    dibujar();

    return () => {
      juego.cortar();
      soltarTodo();
      piano.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", soltarTodo);
      wrap.remove();
    };
  };

  window.SDCPiano = { montar, nombre: (m) => NOMBRES[m % 12] + (Math.floor(m / 12) - 1) };
})();
