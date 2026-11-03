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

  // Ticker: the list twice, so the loop has no gap.
  const cinta = $("cinta");
  for (const item of [...data.cinta, ...data.cinta]) cinta.appendChild(el("span", "", item));

  // Album progress.
  $("progreso").textContent = data.progreso;
  $("estado").textContent = data.estado;
  $("barra").setAttribute("aria-valuenow", data.progreso);
  requestAnimationFrame(() => { $("barra-fill").style.width = data.progreso + "%"; });

  // Diary.
  const diario = $("diario-list");
  for (const entrada of data.diario) {
    const item = el("article", "entrada");
    item.appendChild(el("div", "fecha", entrada.fecha));
    item.appendChild(el("h3", "", entrada.titulo));
    item.appendChild(el("p", "", entrada.texto));
    diario.appendChild(item);
  }

  // Songs and their versions.
  const demos = $("demos-list");
  data.demos.forEach((tema, i) => {
    const box = el("div", "tema");
    const head = el("div", "tema-head");
    head.appendChild(el("span", "tema-num", String(i + 1).padStart(2, "0")));
    head.appendChild(el("span", "tema-titulo", tema.titulo));
    if (tema.nota) head.appendChild(el("span", "tema-nota", tema.nota));
    box.appendChild(head);

    const versiones = (tema.versiones || []).filter((v) => v.archivo);
    if (versiones.length === 0) {
      box.appendChild(el("div", "pronto", "cargando demo... "));
    }
    for (const v of versiones) {
      const row = el("div", "version");
      row.appendChild(el("span", "version-nombre", v.nombre + (v.fecha ? " · " + v.fecha : "")));
      const audio = el("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = v.archivo;
      row.appendChild(audio);
      box.appendChild(row);
    }
    demos.appendChild(box);
  });

  // Art and photos.
  const arte = $("arte-list");
  for (const pieza of data.arte) {
    const fig = el("figure", "cuadro");
    const frame = el("div", "cuadro-img" + (pieza.imagen ? "" : " vacio"));
    if (pieza.imagen) {
      const img = el("img");
      img.src = pieza.imagen;
      img.alt = pieza.titulo;
      img.loading = "lazy";
      frame.appendChild(img);
    }
    fig.appendChild(frame);
    fig.appendChild(el("figcaption", "", pieza.titulo));
    arte.appendChild(fig);
  }

  // Loose ideas.
  const ideas = $("ideas-list");
  for (const idea of data.ideas) ideas.appendChild(el("div", "nota", idea));

  $("anio").textContent = new Date().getFullYear();

  // Every few seconds the title shakes, like a signal dropping out.
  const titulo = document.querySelector(".glitch");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    const burst = () => {
      titulo.classList.remove("burst");
      void titulo.offsetWidth; // restart the animation
      titulo.classList.add("burst");
      setTimeout(burst, 2500 + Math.random() * 4500);
    };
    setTimeout(burst, 1800);
  }
})();
