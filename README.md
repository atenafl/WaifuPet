# WaifuPet

Mascota de escritorio para Windows: una waifu con orejas y cola de gato que
pasea por tu pantalla, habla, baila, duerme y te hace compañía. Hecha con
Electron + Canvas (sin frameworks).

## Descargar y ejecutar

### Windows
1. Descarga **`WaifuPet-1.0.0.exe`** de este repositorio (botón *Code →
   Download ZIP* o el archivo directamente).
2. Doble clic. No necesita instalación ni Node.js.
3. La primera vez Windows mostrará **"Windows protegió tu PC"** (el .exe no
   está firmado): pulsa **Más información → Ejecutar de todos modos**.

### Fedora / Linux (AppImage)
1. Descarga **`WaifuPet-1.0.0.AppImage`** de este repositorio.
2. Dale permisos de ejecución (el ZIP de GitHub no lo conserva):

   ```bash
   chmod +x WaifuPet-1.0.0.AppImage
   ```

   O en Nautilus/GNOME: clic derecho → *Propiedades → Permitir ejecutar
   como programa*.
3. Ejecútalo:

   ```bash
   ./WaifuPet-1.0.0.AppImage
   ```

   Si avisa de `libfuse.so.2`: `sudo dnf install fuse-libs`

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
- **Dos modelos**: waifu (canvas vectorial) y webillo (pixel art).
- **Animaciones**: paseo, baile, sueño, café, lectura, teléfono, cigarrillo,
  desayuno, canto, videojuego, estirarse, saludar, bostezar, tiritar,
  estornudar, animarse con confeti, saltos de conejo, girar, aplaudir,
  taparse los ojos... con frases, burbujas de diálogo y partículas
  (corazones, notas musicales, mariposas, chispas, polvo, Zzz).
- **Tres tamaños** (pequeño/normal/grande) y **sonido** con síntesis WebAudio.

## Desarrollo

```bash
npm install
npm start          # ejecuta en modo desarrollo
npm run dist       # genera dist/WaifuPet-1.0.0.exe (portable, Windows)
npm run dist:linux # genera dist/WaifuPet-1.0.0.AppImage (Linux)
```

Notas de compilación en Windows: `electron-builder` crea symlinks y Windows
lo bloquea sin privilegios. Opciones: compilar en una terminal **como
administrador**, o (como se hizo para este repo) con Docker:

```bash
docker run --rm -v "${PWD}:/src" node:22-slim bash -c \
  "apt-get update -qq && apt-get install -y -qq ca-certificates && \
   update-ca-certificates && mkdir /build && \
   tar -C /src --exclude=node_modules --exclude=dist --exclude=.git -cf - . | tar -C /build -xf - && \
   cd /build && npm install && npx electron-builder --linux AppImage && \
   cp dist/*.AppImage /src/dist/"
```

## Estructura

- `main.js` — proceso principal de Electron (ventana, monitor, menú, IPC)
- `pet.js` — todo el motor de la mascota (física, estados, animaciones, dibujo)
- `preload.js` — puente IPC
- `assets/webillo.png` — sprite de webillo e icono de la app
