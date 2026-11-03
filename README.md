# salir de casa — página de la banda

Sitio de mi banda, *salir de casa*, y diario del primer disco mientras se hace: temas con todas sus versiones, letras, visuales, fotos y el instrumento con el que se graba.

**Sitio en vivo:** https://pedrofelipe14.github.io/salir-de-casa/

## Qué tiene

- **Portada con un piano tocable**: un sintetizador hecho con la **Web Audio API**, que se toca con el mouse, con el dedo o con el teclado de la computadora. Tiene un minijuego para repetir melodías, que guarda tu récord.
- **Página por tema** con versiones, letra, visuales (video propio o YouTube) y fotos.
- **Reproductor persistente**: la música sigue sonando mientras navegás entre páginas.
- Diario, archivo de fotos con visor, y la página del instrumento ([el plugin Salir de Casa](https://github.com/pedrofelipe14/GlitchSynth)).

## Cómo está hecho

- **HTML, CSS y JavaScript sin frameworks ni build**: se abre `index.html` y anda.
- Es una *single-page app* con rutas por hash (`#/temas`, `#/tema/<nombre>`...), así el reproductor de audio nunca se recarga.
- Todo el contenido vive en [`data.js`](data.js): para subir un tema, una foto o una entrada del diario se edita esa lista y nada más.
- Efectos glitch hechos con CSS y JavaScript: título cortado, flash de cámara al hacer clic, grano de película.
- Publicado con **GitHub Pages**.
