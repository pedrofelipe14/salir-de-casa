# salir de casa — página de la banda

Sitio de mi banda, *salir de casa*, y diario del primer disco mientras se hace: temas con todas sus versiones, letras, visuales, fotos y el instrumento con el que se graba.

## Qué tiene

- **Portada**: el nombre de la banda sobre una textura de escaneo / fotocopia generada en el momento (tóner, polvo, rayas del escáner), con una cuenta regresiva.
- **Página por tema** con versiones, letra, visuales (video propio o YouTube) y fotos.
- **Reproductor persistente**: la música sigue sonando mientras navegás entre páginas.
- Diario, archivo de fotos con visor y la página del instrumento ([el plugin Salir de Casa](https://github.com/pedrofelipe14/GlitchSynth)).

## Cómo está hecho

- **HTML, CSS y JavaScript sin frameworks ni build**: se abre `index.html` y anda.
- Es una *single-page app* con rutas por hash (`#/temas`, `#/tema/<nombre>`...), así el reproductor de audio nunca se recarga.
- Todo el contenido vive en [`data.js`](data.js): para subir un tema, una foto o una entrada del diario se edita esa lista y nada más.
- `style.css` tiene la base y `simple.css` la estética actual (negro, grises y mucho espacio).
- La textura de la portada se dibuja en un `<canvas>` y los bordes "fotocopiados" del nombre son un filtro SVG (`feTurbulence` + `feDisplacementMap`).

## Publicarlo

Es un sitio estático: en Vercel se importa el repo con *Framework Preset: Other*, sin comando de build y con la raíz del repo como carpeta de salida.
