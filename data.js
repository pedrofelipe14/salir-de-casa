// Todo el contenido de la página vive acá. Para subir algo nuevo, agregalo a la lista
// que corresponda (lo más nuevo arriba) y recargá. Los archivos van en assets/.

window.SDC = {
  // Cuánto falta para el disco, de 0 a 100.
  progreso: 15,
  estado: "componiendo / armando el universo",

  // Cosas que pasan por la cinta de arriba.
  cinta: [
    "salir de casa",
    "disco en proceso",
    "indietronica / micro tech",
    "demos nuevas pronto",
    "hecho en casa",
    "el plugin también se llama salir de casa",
  ],

  // Diario del disco: lo que va pasando.
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

  // Canciones y sus versiones. archivo: ruta a un mp3 en assets/ (vacío = todavía no).
  demos: [
    { titulo: "pista 01", nota: "sin nombre todavía", versiones: [] },
    { titulo: "pista 02", nota: "sin nombre todavía", versiones: [] },
    { titulo: "pista 03", nota: "sin nombre todavía", versiones: [] },
    // Ejemplo con audio:
    // { titulo: "nombre", nota: "idea de una noche", versiones: [
    //   { nombre: "demo v1", fecha: "2026-11-10", archivo: "assets/audio/nombre-v1.mp3" },
    // ] },
  ],

  // Arte preliminar y fotos. imagen vacía = cuadro reservado.
  arte: [
    { imagen: "assets/banner.png", titulo: "la casa, en tiza" },
    { imagen: "", titulo: "portada (pronto)" },
    { imagen: "", titulo: "fotos (pronto)" },
    { imagen: "", titulo: "bocetos (pronto)" },
  ],

  // Ideas sueltas, como papelitos pegados.
  ideas: [
    "un disco que suene a salir de casa por primera vez en mucho tiempo",
    "glitches que parezcan recuerdos que se traban",
    "el instrumento es parte del disco",
  ],
};
