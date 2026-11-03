// Draws the page from data.js. Nothing here needs editing to add content.
(function () {
  const data = window.SDC;
  const $ = (id) => document.getElementById(id);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const tape = () => {
    const t = el("span", "cinta-papel");
    t.setAttribute("aria-hidden", "true");
    return t;
  };

  // Album progress.
  $("progreso").textContent = data.progreso;
  $("estado").textContent = data.estado;
  requestAnimationFrame(() => { $("progreso-fill").style.width = data.progreso + "%"; });

  // Demos: one cassette per song, one row per version.
  let sonando = null; // { audio, cassette, button }
  const parar = () => {
    if (!sonando) return;
    sonando.audio.pause();
    sonando.cassette.classList.remove("sonando");
    sonando.button.textContent = "▶";
    sonando = null;
  };

  const demos = $("demos-list");
  data.demos.forEach((tema, i) => {
    const cassette = el("article", "cassette");
    const etiqueta = el("div", "etiqueta");
    etiqueta.appendChild(el("div", "etiqueta-rayas"));

    const cuerpo = el("div", "etiqueta-cuerpo");
    const top = el("div", "etiqueta-top");
    top.appendChild(el("span", "etiqueta-titulo", tema.titulo));
    top.appendChild(el("span", "mono", "lado " + (i % 2 ? "b" : "a")));
    cuerpo.appendChild(top);
    if (tema.nota) cuerpo.appendChild(el("p", "etiqueta-nota", tema.nota));

    const ventana = el("div", "ventana");
    ventana.appendChild(el("span", "rueda"));
    const onda = el("span", "cinta-onda");
    for (let b = 0; b < 22; b++) {
      const bar = el("i");
      bar.style.height = 15 + Math.round(Math.abs(Math.sin((b + 1) * (i + 2) * 1.7)) * 85) + "%";
      onda.appendChild(bar);
    }
    ventana.appendChild(onda);
    ventana.appendChild(el("span", "rueda"));
    cuerpo.appendChild(ventana);
    etiqueta.appendChild(cuerpo);
    cassette.appendChild(etiqueta);

    const lista = el("div", "versiones");
    const versiones = (tema.versiones || []).filter((v) => v.archivo);
    if (versiones.length === 0) lista.appendChild(el("div", "pronto", "todavía en el cuarto... pronto"));

    for (const v of versiones) {
      const row = el("div", "version");
      const button = el("button", "play", "▶");
      button.setAttribute("aria-label", "reproducir " + tema.titulo + " " + v.nombre);
      const audio = new Audio();
      audio.preload = "none";
      audio.src = v.archivo;
      audio.addEventListener("ended", parar);

      button.addEventListener("click", () => {
        const eraEste = sonando && sonando.audio === audio;
        parar();
        if (eraEste) return;
        audio.play();
        cassette.classList.add("sonando");
        button.textContent = "❚❚";
        sonando = { audio, cassette, button };
      });

      row.appendChild(button);
      row.appendChild(el("span", "version-nombre", v.nombre));
      if (v.fecha) row.appendChild(el("span", "version-fecha", v.fecha));
      lista.appendChild(row);
    }
    cassette.appendChild(lista);
    demos.appendChild(cassette);
  });

  // Diary.
  const diario = $("diario-list");
  for (const entrada of data.diario) {
    const item = el("article", "entrada");
    item.appendChild(el("div", "entrada-fecha", entrada.fecha));
    item.appendChild(el("h3", "", entrada.titulo));
    item.appendChild(el("p", "", entrada.texto));
    diario.appendChild(item);
  }

  // Moodboard: art/photos and loose ideas, shuffled together like a pinboard.
  const pins = [];
  data.arte.forEach((pieza, i) => {
    const fig = el("figure", "pin polaroid");
    fig.appendChild(tape());
    if (pieza.imagen) {
      const img = el("img");
      img.src = pieza.imagen;
      img.alt = pieza.titulo;
      img.loading = "lazy";
      fig.appendChild(img);
    } else {
      fig.appendChild(el("div", "foto-vacia t" + (i % 3), "foto pendiente"));
    }
    fig.appendChild(el("figcaption", "mano", pieza.titulo));
    pins.push(fig);
  });
  data.ideas.forEach((idea, i) => {
    const nota = el("div", "pin papelito c" + (i % 4), idea);
    nota.prepend(tape());
    // Ideas slot in between the pictures.
    pins.splice(Math.min(pins.length, 1 + i * 2), 0, nota);
  });
  const tablero = $("tablero-list");
  for (const pin of pins) tablero.appendChild(pin);

  $("anio").textContent = new Date().getFullYear();
})();
