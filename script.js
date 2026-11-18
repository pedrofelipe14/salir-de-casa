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
  // con un cielo de polvo de estrellas detrás que se mueve muy lento.
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
    root.appendChild(hero);

    // Polvo de estrellas: puntitos que derivan despacio, a distintas profundidades.
    const ctx = cielo.getContext("2d");
    let W = 0, H = 0, raf = 0, mx = 0, my = 0, tx = 0, ty = 0;
    const estrellas = [];
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cielo.width = W * dpr; cielo.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cuantas = Math.round((W * H) / 5200);
      estrellas.length = 0;
      for (let i = 0; i < cuantas; i++) {
        const z = Math.random();
        estrellas.push({
          x: Math.random() * W, y: Math.random() * H, z,
          r: 0.3 + z * 1.2,
          v: 0.02 + z * 0.12,
          f: Math.random() * Math.PI * 2,
        });
      }
    };
    const dibujar = (t) => {
      ctx.clearRect(0, 0, W, H);
      tx += (mx - tx) * 0.03; ty += (my - ty) * 0.03;
      for (const e of estrellas) {
        if (!reduceMotion) { e.y -= e.v; e.x += e.v * 0.25; }
        if (e.y < -4) { e.y = H + 4; e.x = Math.random() * W; }
        if (e.x > W + 4) e.x = -4;
        const brillo = 0.25 + 0.55 * e.z * (0.6 + 0.4 * Math.sin(t / 1400 + e.f));
        const px = e.x + tx * e.z * 18, py = e.y + ty * e.z * 18;
        ctx.globalAlpha = brillo;
        ctx.fillStyle = "#e6e6e3";
        ctx.beginPath();
        ctx.arc(px, py, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) raf = requestAnimationFrame(dibujar);
    };
    const mover = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!reduceMotion) titulo.style.transform = "translate(" + (-mx * 8).toFixed(1) + "px," + (-my * 6).toFixed(1) + "px)";
    };
    medir();
    raf = requestAnimationFrame(dibujar);
    window.addEventListener("resize", medir);
    window.addEventListener("pointermove", mover, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", medir);
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
