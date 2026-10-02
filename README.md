# WaifuPet

Mascota de escritorio para Windows: una waifu con orejas y cola de gato que
pasea por tu pantalla, habla, baila, duerme y te hace compañía. Hecha con
Electron + Canvas (sin frameworks).

## Descargar y ejecutar

1. Descarga **`WaifuPet-1.0.0.exe`** de este repositorio (botón *Code →
   Download ZIP* o el archivo directamente).
2. Doble clic. No necesita instalación ni Node.js.
3. La primera vez Windows mostrará **"Windows protegió tu PC"** (el .exe no
   está firmado): pulsa **Más información → Ejecutar de todos modos**.

## Controles

| Acción | Resultado |
|---|---|
| Clic izquierdo | La acaricia (se pone feliz y suelta corazones) |
| Doble clic | Salta |
| Arrastrar | Moverla por la pantalla (también entre monitores) |
| Clic derecho | Menú de acciones, modelo, tamaño, pantallas y sonido |

## Características

- **Multipantalla real**: tamaño visual constante (en cm) en todos los
  monitores vía corrección EDID, transición gradual al cruzar de pantalla,
  sin saltos ni vibración; el suelo se adapta a cada monitor.
- **Tres modelos**: waifu (canvas vectorial), webillo (pixel art) y Saitama
  (sprite recortado con brazos y capa en canvas). Saitama además da
  puñetazos (normal, consecutivos y serio, con onda de choque) y va a la
  compra con su bolsa.
- **Animaciones**: paseo, baile, sueño, café, lectura, teléfono, cigarrillo,
  desayuno, canto, videojuego, estirarse, saludar, bostezar, tiritar,
  estornudar, animarse con confeti, saltos de conejo, girar, aplaudir,
  taparse los ojos... con frases, burbujas de diálogo y partículas
  (corazones, notas musicales, mariposas, chispas, polvo, Zzz).
- **Tres tamaños** (pequeño/normal/grande) y **sonido** con síntesis WebAudio.

## Desarrollo

```bash
npm install
npm start        # ejecuta en modo desarrollo
npm run dist     # genera dist/WaifuPet-1.0.0.exe (portable)
```

Notas de compilación: `electron-builder` necesita extraer symlinks en la
primera ejecución; en Windows sin privilegios puede fallar. Solución rápida:
compilar desde una terminal **como administrador**.

## Estructura

- `main.js` — proceso principal de Electron (ventana, monitor, menú, IPC)
- `pet.js` — todo el motor de la mascota (física, estados, animaciones, dibujo)
- `preload.js` — puente IPC
- `assets/webillo.png` — sprite de webillo e icono de la app
- `assets/saitama.png` — sprite de Saitama (sin capa ni brazos)
