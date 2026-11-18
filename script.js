// Draws every page from data.js. Nothing here needs editing to add content.
//
// Pages are hash routes, so the audio player never reloads:
//   #               inicio (and #demos, #diario, #archivo scroll inside it)
//   #/tema/<slug>   one song
//   #/instrumento   the plugin
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

  const pad = (n) => String(n).padStart(2, "0");
  const fmtTime = (s) => (isFinite(s) ? Math.floor(s / 60) + ":" + pad(Math.floor(s % 60)) : "0:00");

  // ---------- always-on bits: clock, year, links, camera flash ----------
  const hora = $("hora");
  const tick = () => {
    const d = new Date();
    hora.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  tick();
  setInterval(tick, 10000);
  $("anio").textContent = new Date().getFullYear();

  const renderLinks = (container) => {
    for (const link of data.links || []) {
      if (link.url) {
        const a = el("a", "", link.nombre);
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener";
        container.appendChild(a);
      } else {
        container.appendChild(el("span", "link-pronto", link.nombre));
      }
    }
  };
  renderLinks($("links-pie"));

  const flash = $("flash");
  document.addEventListener("pointerdown", (e) => {
    if (reduceMotion || e.target.closest("button, a, video, iframe, .player, .lightbox, .player-barra, .piano-wrap")) return;
    flash.style.setProperty("--fx", e.clientX + "px");
    flash.style.setProperty("--fy", e.clientY + "px");
    flash.classList.remove("on");
    void flash.offsetWidth; // restart the animation
    flash.classList.add("on");
  });

  // ---------- lightbox ----------
  const lightbox = $("lightbox");
  const abrirFoto = (src, titulo) => {
    $("lb-img").src = src;
    $("lb-img").alt = titulo || "";
    $("lb-titulo").textContent = titulo || "";
    lightbox.hidden = false;
  };
  const cerrarFoto = () => { lightbox.hidden = true; $("lb-img").removeAttribute("src"); };
  lightbox.addEventListener("click", cerrarFoto);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarFoto(); });

  // ---------- player: one audio element for the whole site ----------
  const player = (() => {
    const audio = new Audio();
    const bar = $("player");
    const toggle = $("p-toggle");
    const osc = $("p-osc");
    const g = osc.getContext("2d");
    let actual = null; // { archivo, titulo, version, link }
    let raf = 0;
    const listeners = new Set();

    const notify = () => listeners.forEach((fn) => fn());

    // The scope is drawn, not measured: real analysis needs the audio to be same-origin,
    // which a page opened straight from disk isn't.
    const draw = (t) => {
      g.clearRect(0, 0, osc.width, osc.height);
      g.strokeStyle = "#9fe0a9";
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= osc.width; x += 4) {
        const y = osc.height / 2
          + Math.sin(x * 0.07 + t * 0.012) * 9
          + Math.sin(x * 0.29 - t * 0.021) * 5 * Math.random();
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      raf = requestAnimationFrame(draw);
    };
    const flat = () => {
      cancelAnimationFrame(raf);
      g.clearRect(0, 0, osc.width, osc.height);
      g.strokeStyle = "#2a2a2a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, osc.height / 2);
      g.lineTo(osc.width, osc.height / 2);
      g.stroke();
    };

    audio.addEventListener("play", () => { toggle.textContent = "pause"; cancelAnimationFrame(raf); if (!reduceMotion) raf = requestAnimationFrame(draw); notify(); });
    audio.addEventListener("pause", () => { toggle.textContent = "play"; flat(); notify(); });
    audio.addEventListener("ended", () => { toggle.textContent = "play"; flat(); notify(); });
    audio.addEventListener("timeupdate", () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      $("p-fill").style.width = pct + "%";
      $("p-tiempo").textContent = fmtTime(audio.currentTime) + " / " + fmtTime(audio.duration);
    });

    toggle.addEventListener("click", () => (audio.paused ? audio.play() : audio.pause()));
    $("p-cerrar").addEventListener("click", () => {
      audio.pause();
      actual = null;
      bar.hidden = true;
      document.body.classList.remove("con-player");
      notify();
    });

    const seekTo = (clientX) => {
      const r = $("p-barra").getBoundingClientRect();
      if (audio.duration) audio.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * audio.duration;
    };
    $("p-barra").addEventListener("pointerdown", (e) => seekTo(e.clientX));
    $("p-barra").addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") audio.currentTime += 5;
      if (e.key === "ArrowLeft") audio.currentTime -= 5;
    });

    return {
      play(track) {
        if (actual && actual.archivo === track.archivo) {
          audio.paused ? audio.play() : audio.pause();
          return;
        }
        actual = track;
        audio.src = track.archivo;
        audio.play();
        $("p-titulo").textContent = track.titulo;
        $("p-titulo").href = track.link || "#";
        $("p-version").textContent = track.version || "";
        bar.hidden = false;
        document.body.classList.add("con-player");
        flat();
      },
      pause() { audio.pause(); },
      isPlaying(archivo) { return !!actual && actual.archivo === archivo && !audio.paused; },
      onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
  })();

  // A play button wired to the shared player; it keeps showing the right state.
  // Buttons from pages you've left are dropped at the next route change.
  let pageCleanups = [];
  const playButton = (track) => {
    const button = el("button", "play", "play");
    button.setAttribute("aria-label", "reproducir " + track.titulo + (track.version ? ", " + track.version : ""));
    const sync = () => {
      const on = player.isPlaying(track.archivo);
      button.classList.toggle("on", on);
      button.textContent = on ? "pause" : "play";
    };
    button.addEventListener("click", () => player.play(track));
    pageCleanups.push(player.onChange(sync));
    sync();
    return button;
  };

  // ---------- shared building blocks ----------
  const temaLink = (tema) => "#/tema/" + tema.slug;

  // link: where the player's title takes you while this plays.
  const versionRow = (tema, v, link = temaLink(tema)) => {
    const row = el("div", "version");
    row.appendChild(playButton({ archivo: v.archivo, titulo: tema.titulo, version: v.nombre, link }));
    row.appendChild(el("span", "", v.nombre));
    if (v.fecha) row.appendChild(el("span", "version-fecha", v.fecha));
    return row;
  };

  const pronto = (text) => el("p", "pronto", text || "pronto");

  const fotoPieza = (pieza, i) => {
    const fig = el("figure", "pieza");
    const foto = el(pieza.imagen ? "button" : "div", "foto" + (pieza.imagen ? "" : " vacia"));
    if (pieza.imagen) {
      foto.setAttribute("aria-label", "ver " + pieza.titulo);
      const img = el("img");
      img.src = pieza.imagen;
      img.alt = pieza.titulo;
      img.loading = "lazy";
      foto.appendChild(img);
      foto.addEventListener("click", () => abrirFoto(pieza.imagen, pieza.titulo));
    }
    foto.appendChild(el("span", "foto-etiqueta", "img_" + pad(i + 1) + (pieza.imagen ? ".jpg" : " — sin revelar")));
    fig.appendChild(foto);
    fig.appendChild(el("figcaption", "mono", pieza.titulo));
    return fig;
  };

  // messy: the scattered collage of the home archive; otherwise an even grid.
  const galeria = (fotos, messy = false) => {
    const grid = el("div", messy ? "archivo" : "galeria");
    fotos.forEach((f, i) => grid.appendChild(fotoPieza(f, i)));
    return grid;
  };

  const visualesGrid = (visuales) => {
    const grid = el("div", "visuales");
    for (const v of visuales) {
      const fig = el("figure", "visual");
      if (v.youtube) {
        const frame = el("iframe");
        frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.youtube);
        frame.title = v.titulo || "video";
        frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        frame.loading = "lazy";
        fig.appendChild(frame);
      } else if (v.archivo) {
        const video = el("video");
        video.src = v.archivo;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        // Watching a visualizer pauses the demo underneath.
        video.addEventListener("play", () => player.pause());
        fig.appendChild(video);
      }
      fig.appendChild(el("figcaption", "mono", v.titulo || ""));
      grid.appendChild(fig);
    }
    return grid;
  };

  const subtitulo = (num, text) => {
    const h = el("h2", "sub-titulo");
    h.appendChild(el("span", "num", num));
    h.appendChild(document.createTextNode(text));
    return h;
  };

  // ---------- page: inicio ----------
  // El nombre gigante, que aparece letra por letra saliendo de la oscuridad,
  // sobre una textura sucia de escaneo, como una fotocopia vieja.
  const vistaInicio = (root) => {
    const hero = el("section", "hero");

    const cielo = document.createElement("canvas");
    cielo.className = "cielo";
    cielo.setAttribute("aria-hidden", "true");
    hero.appendChild(cielo);

    const titulo = el("h1", "titulo");
    titulo.setAttribute("aria-label", "salir de casa");
    let n = 0;
    "salir de casa".split(" ").forEach((palabra, p) => {
      if (p > 0) titulo.appendChild(document.createTextNode(" "));
      const pal = el("span", "palabra");
      pal.setAttribute("aria-hidden", "true");
      for (const c of palabra) {
        const letra = el("span", "letra-t", c);
        letra.style.setProperty("--d", (0.35 + n * 0.13).toFixed(2) + "s");
        n++;
        pal.appendChild(letra);
      }
      titulo.appendChild(pal);
    });
    hero.appendChild(titulo);

    // Cuenta regresiva hasta el 18 de febrero de 2027, 00:00 en Argentina.
    const FECHA = new Date("2027-02-18T00:00:00-03:00").getTime();
    const cuenta = el("p", "cuenta");
    cuenta.setAttribute("aria-label", "cuenta regresiva");
    hero.appendChild(cuenta);
    const dos = (n) => String(n).padStart(2, "0");
    const tic = () => {
      const falta = Math.max(0, FECHA - Date.now());
      const seg = Math.floor(falta / 1000);
      const d = Math.floor(seg / 86400), h = Math.floor(seg / 3600) % 24, m = Math.floor(seg / 60) % 60, x = seg % 60;
      cuenta.textContent = d + "d " + dos(h) + "h " + dos(m) + "m " + dos(x) + "s";
    };
    tic();
    const reloj = setInterval(tic, 1000);
    root.appendChild(hero);

    // Textura de escaneo / fotocopia: se dibuja una vez (y de nuevo si cambia el tamaño).
    // Tóner desparejo, grano, polvo, pelitos, rayas del escáner y bordes quemados.
    const ctx = cielo.getContext("2d");
    const azar = (min, max) => min + Math.random() * (max - min);
    const textura = () => {
      const W = hero.clientWidth, H = hero.clientHeight;
      cielo.width = W; cielo.height = H;

      // 1) tóner desparejo: manchas grandes y suaves (ruido chico estirado)
      const chico = document.createElement("canvas");
      chico.width = Math.ceil(W / 40); chico.height = Math.ceil(H / 40);
      const cc = chico.getContext("2d");
      const manchas = cc.createImageData(chico.width, chico.height);
      for (let i = 0; i < manchas.data.length; i += 4) {
        const v = 8 + Math.random() * 22;
        manchas.data[i] = manchas.data[i + 1] = manchas.data[i + 2] = v;
        manchas.data[i + 3] = 255;
      }
      cc.putImageData(manchas, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(chico, 0, 0, W, H);

      // 2) grano fino de fotocopia
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 34 + (Math.random() < 0.004 ? azar(40, 120) : 0);
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);

      // 3) bandas horizontales del escáner
      for (let y = 0; y < H; y += azar(3, 40)) {
        ctx.fillStyle = "rgba(255,255,255," + azar(0, 0.025).toFixed(3) + ")";
        ctx.fillRect(0, y, W, azar(1, 6));
      }
      // 4) rayas verticales largas (vidrio del escáner sucio)
      for (let i = 0; i < Math.round(W / 140); i++) {
        const x = azar(0, W);
        ctx.fillStyle = "rgba(230,230,225," + azar(0.03, 0.12).toFixed(3) + ")";
        ctx.fillRect(x, azar(-H * 0.2, H * 0.3), azar(0.5, 1.6), azar(H * 0.4, H * 1.2));
      }
      // 5) polvo: puntitos y grumos claros
      for (let i = 0; i < (W * H) / 2600; i++) {
        ctx.fillStyle = "rgba(235,235,230," + azar(0.15, 0.7).toFixed(2) + ")";
        ctx.beginPath();
        ctx.ellipse(azar(0, W), azar(0, H), azar(0.4, 2.2), azar(0.4, 1.6), azar(0, 3.14), 0, Math.PI * 2);
        ctx.fill();
      }
      // 6) pelitos y fibras
      ctx.lineCap = "round";
      for (let i = 0; i < Math.round((W * H) / 90000); i++) {
        const x = azar(0, W), y = azar(0, H), l = azar(20, 120);
        ctx.strokeStyle = "rgba(230,230,225," + azar(0.12, 0.4).toFixed(2) + ")";
        ctx.lineWidth = azar(0.4, 1.1);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + azar(-l, l), y + azar(-l, l), x + azar(-l, l), y + azar(-l, l), x + azar(-l, l), y + azar(-l, l));
        ctx.stroke();
      }
      // 7) manchas negras de tóner
      for (let i = 0; i < Math.round((W * H) / 60000); i++) {
        ctx.fillStyle = "rgba(0,0,0," + azar(0.3, 0.7).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(azar(0, W), azar(0, H), azar(1, 7), 0, Math.PI * 2);
        ctx.fill();
      }
      // 8) bordes quemados y una franja de luz donde no cerró la tapa del escáner
      const vin = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
      vin.addColorStop(0, "rgba(0,0,0,0)");
      vin.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = vin;
      ctx.fillRect(0, 0, W, H);
      const borde = ctx.createLinearGradient(W, 0, W - W * 0.08, 0);
      borde.addColorStop(0, "rgba(220,220,215,0.22)");
      borde.addColorStop(1, "rgba(220,220,215,0)");
      ctx.fillStyle = borde;
      ctx.fillRect(W - W * 0.08, 0, W * 0.08, H);
    };
    const mover = (e) => {
      if (reduceMotion) return;
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      titulo.style.transform = "translate(" + (-mx * 6).toFixed(1) + "px," + (-my * 4).toFixed(1) + "px)";
    };
    let espera = 0;
    const alCambiar = () => { clearTimeout(espera); espera = setTimeout(textura, 150); };
    textura();
    window.addEventListener("resize", alCambiar);
    window.addEventListener("pointermove", mover, { passive: true });

    return () => {
      clearInterval(reloj);
      clearTimeout(espera);
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("pointermove", mover);
    };
  };

  // ---------- section pages: temas, diario, archivo ----------
  // A page header shared by every inner page: big glitchable title over a small label.
  const paginaHead = (label, text, extra) => {
    const head = el("header", "pagina-head");
    head.appendChild(el("span", "num", label));
    const h1 = el("h1", "pagina-titulo", text);
    h1.dataset.text = text;
    head.appendChild(h1);
    if (extra) head.appendChild(extra);
    return head;
  };

  const vistaTemas = (root) => {
    document.title = "temas — salir de casa";
    const page = el("article", "pagina");
    page.appendChild(paginaHead("01", "temas",
      el("p", "mono", "disco #1 — sin nombre · " + data.progreso + "% — " + data.estado)));

    // Each row opens the song; versions play right here too.
    const lista = el("ol", "tracks");
    data.temas.forEach((tema, i) => {
      const li = el("li", "track");
      const head = el("a", "track-head");
      head.href = temaLink(tema);
      head.appendChild(el("span", "track-num", pad(i + 1)));
      head.appendChild(el("span", "track-titulo", tema.titulo));
      head.appendChild(el("span", "track-nota", tema.nota || ""));
      head.appendChild(el("span", "track-flecha", "entrar →"));
      li.appendChild(head);

      const versiones = (tema.versiones || []).filter((v) => v.archivo);
      if (versiones.length > 0) {
        const box = el("div", "versiones");
        for (const v of versiones) box.appendChild(versionRow(tema, v));
        li.appendChild(box);
      }
      lista.appendChild(li);
    });
    page.appendChild(lista);
    root.appendChild(page);
  };

  const vistaDiario = (root) => {
    document.title = "diario — salir de casa";
    const page = el("article", "pagina");
    page.appendChild(paginaHead("02", "diario"));
    const entradas = el("div", "diario");
    for (const entrada of data.diario) {
      const item = el("article", "entrada");
      item.appendChild(el("div", "entrada-fecha", entrada.fecha));
      const cuerpo = el("div");
      cuerpo.appendChild(el("h3", "", entrada.titulo));
      cuerpo.appendChild(el("p", "", entrada.texto));
      item.appendChild(cuerpo);
      entradas.appendChild(item);
    }
    page.appendChild(entradas);
    root.appendChild(page);
  };

  const vistaArchivo = (root) => {
    document.title = "archivo — salir de casa";
    const page = el("article", "pagina");
    page.appendChild(paginaHead("03", "archivo", el("p", "mono", "fotos, arte, bocetos, ideas sueltas. se va llenando.")));
    const grid = galeria(data.arte, true);
    (data.ideas || []).forEach((idea, i) => {
      const wrap = el("div", "pieza");
      wrap.appendChild(el("p", "nota-marcador", idea));
      grid.insertBefore(wrap, grid.children[Math.min(grid.children.length, 1 + i * 2)] || null);
    });
    page.appendChild(grid);
    root.appendChild(page);
  };

  // ---------- page: one song ----------
  const vistaTema = (root, slug) => {
    const index = data.temas.findIndex((t) => t.slug === slug);
    if (index < 0) return vistaNoEncontrado(root);
    const tema = data.temas[index];
    document.title = tema.titulo + " — salir de casa";

    const page = el("article", "pagina");
    const volver = el("a", "volver mono", "← temas");
    volver.href = "#/temas";
    page.appendChild(volver);

    const head = el("header", "pagina-head");
    head.appendChild(el("span", "num", "tema " + pad(index + 1)));
    const h1 = el("h1", "pagina-titulo", tema.titulo);
    h1.dataset.text = tema.titulo;
    head.appendChild(h1);
    if (tema.nota) head.appendChild(el("p", "mono", tema.nota));
    page.appendChild(head);

    const versiones = (tema.versiones || []).filter((v) => v.archivo);
    const secVersiones = el("section", "pagina-seccion");
    secVersiones.appendChild(subtitulo("a", "versiones"));
    if (versiones.length === 0) secVersiones.appendChild(pronto("todavía no sale del cuarto"));
    else {
      const box = el("div", "versiones solo");
      for (const v of versiones) box.appendChild(versionRow(tema, v));
      secVersiones.appendChild(box);
    }
    page.appendChild(secVersiones);

    const secLetra = el("section", "pagina-seccion");
    secLetra.appendChild(subtitulo("b", "letra"));
    if (tema.letra && tema.letra.trim()) secLetra.appendChild(el("div", "letra", tema.letra.trim()));
    else secLetra.appendChild(pronto());
    page.appendChild(secLetra);

    const secVisuales = el("section", "pagina-seccion");
    secVisuales.appendChild(subtitulo("c", "visuales"));
    if ((tema.visuales || []).length === 0) secVisuales.appendChild(pronto());
    else secVisuales.appendChild(visualesGrid(tema.visuales));
    page.appendChild(secVisuales);

    const secFotos = el("section", "pagina-seccion");
    secFotos.appendChild(subtitulo("d", "fotos"));
    if ((tema.fotos || []).length === 0) secFotos.appendChild(pronto());
    else secFotos.appendChild(galeria(tema.fotos));
    page.appendChild(secFotos);

    // Previous / next song, wrapping around.
    const nav = el("nav", "pagina-nav");
    const prev = data.temas[(index - 1 + data.temas.length) % data.temas.length];
    const next = data.temas[(index + 1) % data.temas.length];
    const aPrev = el("a", "", "← " + prev.titulo);
    aPrev.href = temaLink(prev);
    const aNext = el("a", "", next.titulo + " →");
    aNext.href = temaLink(next);
    nav.appendChild(aPrev);
    nav.appendChild(aNext);
    page.appendChild(nav);

    root.appendChild(page);
  };

  // ---------- page: the instrument ----------
  const vistaInstrumento = (root) => {
    const inst = data.instrumento;
    document.title = "instrumento — salir de casa";

    const page = el("article", "pagina");
    const volver = el("a", "volver mono", "← inicio");
    volver.href = "#";
    page.appendChild(volver);

    const head = el("header", "pagina-head");
    head.appendChild(el("span", "num", inst.archivo));
    const h1 = el("h1", "pagina-titulo", inst.nombre);
    h1.dataset.text = inst.nombre;
    head.appendChild(h1);
    const meta = el("div", "inst-meta");
    meta.appendChild(el("span", "mono", inst.estado + " · " + inst.formato));
    if (inst.descarga) {
      const a = el("a", "boton", "descargar");
      a.href = inst.descarga;
      meta.appendChild(a);
    } else {
      meta.appendChild(el("span", "boton apagado", "descarga — pronto"));
    }
    head.appendChild(meta);
    page.appendChild(head);

    const capturas = inst.capturas || [];
    if (capturas.length > 0) {
      const principal = el("button", "captura grande");
      principal.setAttribute("aria-label", "ver " + capturas[0].titulo);
      const img = el("img");
      img.src = capturas[0].imagen;
      img.alt = capturas[0].titulo;
      principal.appendChild(img);
      principal.addEventListener("click", () => abrirFoto(capturas[0].imagen, capturas[0].titulo));
      page.appendChild(principal);
    }

    const secFunciones = el("section", "pagina-seccion");
    secFunciones.appendChild(subtitulo("a", "qué tiene"));
    const ul = el("ul", "funciones");
    (inst.funciones || []).forEach((f, i) => {
      const li = el("li");
      li.appendChild(el("span", "num", pad(i + 1)));
      li.appendChild(el("span", "", f));
      ul.appendChild(li);
    });
    secFunciones.appendChild(ul);
    page.appendChild(secFunciones);

    const secSonidos = el("section", "pagina-seccion");
    secSonidos.appendChild(subtitulo("b", "cómo suena"));
    const sonidos = (inst.sonidos || []).filter((s) => s.archivo);
    if (sonidos.length === 0) secSonidos.appendChild(pronto());
    else {
      const box = el("div", "versiones solo");
      for (const s of sonidos) box.appendChild(versionRow({ titulo: "instrumento" }, s, "#/instrumento"));
      secSonidos.appendChild(box);
    }
    page.appendChild(secSonidos);

    const secVisuales = el("section", "pagina-seccion");
    secVisuales.appendChild(subtitulo("c", "visuales"));
    if ((inst.visuales || []).length === 0) secVisuales.appendChild(pronto());
    else secVisuales.appendChild(visualesGrid(inst.visuales));
    page.appendChild(secVisuales);

    if (capturas.length > 1) {
      const secCapturas = el("section", "pagina-seccion");
      secCapturas.appendChild(subtitulo("d", "capturas"));
      secCapturas.appendChild(galeria(capturas.slice(1)));
      page.appendChild(secCapturas);
    }

    const secCambios = el("section", "pagina-seccion");
    secCambios.appendChild(subtitulo(capturas.length > 1 ? "e" : "d", "versiones"));
    const cambios = el("div", "diario");
    for (const c of inst.cambios || []) {
      const item = el("article", "entrada");
      item.appendChild(el("div", "entrada-fecha", "v" + c.version + " · " + c.fecha));
      const cuerpo = el("div");
      cuerpo.appendChild(el("p", "", c.texto));
      item.appendChild(cuerpo);
      cambios.appendChild(item);
    }
    secCambios.appendChild(cambios);
    page.appendChild(secCambios);

    root.appendChild(page);
  };

  const vistaNoEncontrado = (root) => {
    const page = el("article", "pagina");
    const h1 = el("h1", "pagina-titulo", "no está");
    h1.dataset.text = "no está";
    page.appendChild(h1);
    const a = el("a", "volver mono", "← volver al inicio");
    a.href = "#";
    page.appendChild(a);
    root.appendChild(page);
  };

  // ---------- router ----------
  const vista = $("vista");
  let cleanupVista = null;
  let rutaActual = null;

  const secciones = {
    "/temas": vistaTemas,
    "/diario": vistaDiario,
    "/archivo": vistaArchivo,
    "/instrumento": vistaInstrumento,
  };
  // Old links from when everything lived on the home page.
  const viejos = { demos: "/temas", diario: "/diario", archivo: "/archivo", instrumento: "/instrumento" };

  const route = () => {
    let hash = location.hash.replace(/^#/, "");
    if (viejos[hash]) hash = viejos[hash];
    const enInicio = hash === "" || hash === "/";
    const ruta = enInicio ? "inicio" : hash;
    if (ruta === rutaActual) return;

    if (cleanupVista) cleanupVista();
    pageCleanups.forEach((fn) => fn());
    pageCleanups = [];
    vista.replaceChildren();
    document.title = "salir de casa";
    document.body.classList.toggle("inicio", enInicio);  // the green cover
    document.body.classList.toggle("interna", !enInicio); // shows the fixed "← inicio"
    document.querySelectorAll(".barra-nav a").forEach((a) => {
      a.classList.toggle("activo", a.getAttribute("href") === "#" + hash);
    });

    const tema = hash.match(/^\/tema\/([^/]+)/);
    if (enInicio) cleanupVista = vistaInicio(vista);
    else if (tema) cleanupVista = vistaTema(vista, decodeURIComponent(tema[1]));
    else if (secciones[hash]) cleanupVista = secciones[hash](vista);
    else cleanupVista = vistaNoEncontrado(vista);
    rutaActual = ruta;

    window.scrollTo({ top: 0, behavior: "instant" });
  };

  window.addEventListener("hashchange", route);
  route();
})();
