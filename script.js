// Draws the page from data.js. Nothing here needs editing to add content.
(function () {
  const data = window.SDC;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Clock in the corner: it's always late at night here.
  const hora = $("hora");
  const tick = () => {
    const d = new Date();
    hora.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  tick();
  setInterval(tick, 10000);

  $("progreso").textContent = data.progreso;
  $("estado").textContent = data.estado;
  $("anio").textContent = new Date().getFullYear();

  // ---------- logo: drawn to a canvas so it can tear like a bad signal ----------
  const canvas = $("logo");
  const ctx = canvas.getContext("2d");
  const logo = new Image();
  logo.src = "assets/banner.png";

  const drawClean = () => {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(logo, 0, 0, canvas.width, canvas.height);
  };

  // Horizontal slices pushed sideways + a coloured ghost: datamosh, cheaply.
  const drawTorn = (intensity) => {
    drawClean();
    const w = canvas.width;
    const h = canvas.height;
    const slices = 3 + Math.floor(Math.random() * 6 * intensity);
    for (let i = 0; i < slices; i++) {
      const y = Math.random() * h;
      const sh = 4 + Math.random() * h * 0.12;
      const dx = (Math.random() - 0.5) * w * 0.12 * intensity;
      ctx.drawImage(canvas, 0, y, w, sh, dx, y, w, sh);
    }
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35 * intensity;
    ctx.drawImage(logo, 6 * intensity, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  logo.onload = () => {
    canvas.width = logo.naturalWidth;
    canvas.height = logo.naturalHeight;
    drawClean();
    if (reduceMotion) return;

    const burst = () => {
      let frames = 3 + Math.floor(Math.random() * 6);
      const step = () => {
        if (frames-- > 0) {
          drawTorn(0.4 + Math.random() * 0.8);
          setTimeout(step, 50 + Math.random() * 60);
        } else {
          drawClean();
          setTimeout(burst, 1500 + Math.random() * 3500);
        }
      };
      step();
    };
    setTimeout(burst, 900);
  };

  // ---------- title: sliced copies flicker in with the logo's rhythm ----------
  const titulo = document.querySelector(".titulo");
  if (!reduceMotion) {
    const flicker = () => {
      titulo.classList.add("glitch");
      setTimeout(() => titulo.classList.remove("glitch"), 90 + Math.random() * 120);
      setTimeout(flicker, 2200 + Math.random() * 4000);
    };
    setTimeout(flicker, 1600);
  }

  // ---------- click anywhere: camera flash ----------
  const flash = $("flash");
  document.addEventListener("pointerdown", (e) => {
    if (reduceMotion || e.target.closest("button, a")) return;
    flash.style.setProperty("--fx", e.clientX + "px");
    flash.style.setProperty("--fy", e.clientY + "px");
    flash.classList.remove("on");
    void flash.offsetWidth; // restart the animation
    flash.classList.add("on");
  });

  // ---------- demos ----------
  let sonando = null; // { audio, button, stop }
  const parar = () => {
    if (!sonando) return;
    sonando.audio.pause();
    sonando.button.classList.remove("on");
    sonando.button.textContent = "play";
    sonando.stop();
    sonando = null;
  };

  // A tiny oscilloscope line that wiggles while a demo plays (fake, but alive).
  const makeScope = () => {
    const c = el("canvas", "osc");
    c.width = 240;
    c.height = 44;
    const g = c.getContext("2d");
    let raf = 0;
    const draw = (t) => {
      g.clearRect(0, 0, c.width, c.height);
      g.strokeStyle = "#9fe0a9";
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= c.width; x += 4) {
        const y = c.height / 2
          + Math.sin(x * 0.09 + t * 0.012) * 8
          + Math.sin(x * 0.31 - t * 0.02) * 4 * Math.random();
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      raf = requestAnimationFrame(draw);
    };
    const flat = () => {
      g.clearRect(0, 0, c.width, c.height);
      g.strokeStyle = "#2a2a2a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, c.height / 2);
      g.lineTo(c.width, c.height / 2);
      g.stroke();
    };
    flat();
    return {
      node: c,
      start: () => { raf = requestAnimationFrame(draw); },
      stop: () => { cancelAnimationFrame(raf); flat(); },
    };
  };

  const demos = $("demos-list");
  data.demos.forEach((tema, i) => {
    const li = el("li", "track");
    const head = el("div", "track-head");
    head.appendChild(el("span", "track-num", String(i + 1).padStart(2, "0")));
    head.appendChild(el("span", "track-titulo", tema.titulo));
    head.appendChild(el("span", "track-nota", tema.nota || ""));
    li.appendChild(head);

    const lista = el("div", "versiones");
    const versiones = (tema.versiones || []).filter((v) => v.archivo);
    if (versiones.length === 0) lista.appendChild(el("span", "pronto", "todavía no sale del cuarto"));

    for (const v of versiones) {
      const row = el("div", "version");
      const button = el("button", "play", "play");
      button.setAttribute("aria-label", "reproducir " + tema.titulo + ", " + v.nombre);
      const scope = makeScope();
      const audio = new Audio();
      audio.preload = "none";
      audio.src = v.archivo;
      audio.addEventListener("ended", parar);

      button.addEventListener("click", () => {
        const eraEste = sonando && sonando.audio === audio;
        parar();
        if (eraEste) return;
        audio.play();
        button.classList.add("on");
        button.textContent = "stop";
        scope.start();
        sonando = { audio, button, stop: scope.stop };
      });

      row.appendChild(button);
      row.appendChild(el("span", "", v.nombre));
      row.appendChild(scope.node);
      if (v.fecha) row.appendChild(el("span", "version-fecha", v.fecha));
      lista.appendChild(row);
    }
    li.appendChild(lista);
    demos.appendChild(li);
  });

  // ---------- diario ----------
  const diario = $("diario-list");
  for (const entrada of data.diario) {
    const item = el("article", "entrada");
    item.appendChild(el("div", "entrada-fecha", entrada.fecha));
    const cuerpo = el("div");
    cuerpo.appendChild(el("h3", "", entrada.titulo));
    cuerpo.appendChild(el("p", "", entrada.texto));
    item.appendChild(cuerpo);
    diario.appendChild(item);
  }

  // ---------- archivo: photos and marker notes, interleaved ----------
  const piezas = [];
  data.arte.forEach((pieza, i) => {
    const fig = el("figure", "pieza");
    const foto = el("div", "foto" + (pieza.imagen ? "" : " vacia"));
    if (pieza.imagen) {
      const img = el("img");
      img.src = pieza.imagen;
      img.alt = pieza.titulo;
      img.loading = "lazy";
      foto.appendChild(img);
    }
    foto.appendChild(el("span", "foto-etiqueta", "img_" + String(i + 1).padStart(3, "0") + (pieza.imagen ? ".jpg" : " — sin revelar")));
    fig.appendChild(foto);
    fig.appendChild(el("figcaption", "mono", pieza.titulo));
    piezas.push(fig);
  });
  data.ideas.forEach((idea, i) => {
    const wrap = el("div", "pieza");
    wrap.appendChild(el("p", "nota-marcador", idea));
    piezas.splice(Math.min(piezas.length, 1 + i * 2), 0, wrap);
  });
  const archivo = $("archivo-list");
  for (const p of piezas) archivo.appendChild(p);
})();
