// Todo el contenido de la página vive acá. Para subir algo nuevo, agregalo a la lista
// que corresponda y recargá. Los archivos van en assets/ (audio/, video/, fotos/...).
//
// Fotos:   { imagen: "assets/fotos/algo.jpg", titulo: "lo que dice abajo" }
// Audio:   { nombre: "demo v1", fecha: "2026-11-10", archivo: "assets/audio/tema-v1.mp3" }
// Visual:  { titulo: "visualizer", archivo: "assets/video/tema.mp4" }   (video propio)
//          { titulo: "visualizer", youtube: "dQw4w9WgXcQ" }              (id de un video de YouTube)

window.SDC = {
  // Cuánto falta para el disco, de 0 a 100.
  progreso: 15,
  estado: "componiendo / armando el universo",

  // Redes. Las que tengan url aparecen arriba y abajo; las vacías quedan como "pronto".
  links: [
    { nombre: "instagram", url: "" },
    { nombre: "bandcamp", url: "" },
    { nombre: "spotify", url: "" },
    { nombre: "youtube", url: "" },
  ],

  // Diario del disco: lo que va pasando (lo más nuevo arriba).
  diario: [
    {
      fecha: "2026-11-02",
      titulo: "se abre la casa",
      texto: "Arranca esta página. Acá va a ir quedando todo: demos, versiones, fotos, arte e ideas sueltas mientras se arma el disco.",
    },
    {
      fecha: "2026-11-02",
      titulo: "el plugin ya respira",
      texto: "El sintetizador Salir de Casa ya tiene dos osciladores con ondas dibujadas a mano, LFO, micro-loops glitch y presets propios. Es el instrumento con el que se está haciendo el disco.",
    },
  ],

  // Los temas del disco. Cada uno tiene su propia página.
  //   slug: cómo aparece en la dirección (sin espacios ni tildes), ej. "pista-01"
  //   letra: el texto tal cual, con saltos de línea (usá comillas invertidas `...`)
  temas: [
    {
      slug: "pista-01",
      titulo: "pista 01",
      nota: "sin nombre todavía",
      letra: ``,
      versiones: [],
      visuales: [],
      fotos: [],
    },
    {
      slug: "pista-02",
      titulo: "pista 02",
      nota: "sin nombre todavía",
      letra: ``,
      versiones: [],
      visuales: [],
      fotos: [],
    },
    {
      slug: "pista-03",
      titulo: "pista 03",
      nota: "sin nombre todavía",
      letra: ``,
      versiones: [],
      visuales: [],
      fotos: [],
    },
  ],

  // Arte preliminar y fotos del disco en general. imagen vacía = cuadro reservado.
  arte: [
    { imagen: "assets/banner.png", titulo: "la casa, en tiza" },
    { imagen: "", titulo: "portada (pronto)" },
    { imagen: "", titulo: "fotos (pronto)" },
    { imagen: "", titulo: "bocetos (pronto)" },
  ],

  // Ideas sueltas, en marcador, mezcladas con las fotos del archivo.
  ideas: [
    // "una idea suelta, en marcador",
  ],

  // El plugin, con su propia página.
  instrumento: {
    nombre: "salir de casa",
    archivo: "salir_de_casa.vst3",
    estado: "en desarrollo",
    formato: "vst3 · windows",
    descarga: "", // link de descarga cuando salga

    capturas: [
      { imagen: "assets/plugin.png", titulo: "interfaz" },
    ],

    funciones: [
      "2 osciladores: seno, sierra, cuadrada, triangular o una onda propia que se dibuja moviendo puntos",
      "filtro pasa-bajos con resonancia y envolvente",
      "lfo a filtro, tono o volumen",
      "pitch bend (slides de fl studio)",
      "micro-loop glitch, también sobre audio externo por sidechain",
      "reverb / delay / slip",
      "presets de fábrica y presets propios",
    ],

    // Ejemplos de cómo suena.
    sonidos: [],

    visuales: [],

    // Historial de versiones (lo más nuevo arriba).
    cambios: [
      { version: "0.3", fecha: "2026-11-02", texto: "lfo, presets propios" },
      { version: "0.2", fecha: "2026-11-02", texto: "dos osciladores, ondas por puntos, interfaz nueva, pitch bend" },
    ],
  },
};
