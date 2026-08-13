# Long Way

**Live site:** https://shamrytest-del.github.io/long-way/

Long Way is a fullscreen ambient driving website. A small car follows an endlessly generated country road while fields, ponds, homes, orchards, and trees flow past in a warm minimal-flat illustration style.

## Experience

- Procedurally generated road and countryside with no fixed scene loop
- Location-aware current weather through the browser Geolocation API and Open-Meteo
- Day, dawn, golden-hour, and night palettes based on local time
- Rain, snow, mist, wind, and temperature states
- Generative ambient audio that begins after the visitor's first interaction
- Working mute/unmute and location refresh controls, plus keyboard shortcuts
- Rotating calming reflections and reduced-motion support
- Responsive desktop and mobile layouts

## Run locally

```bash
npm install
npm run dev
```

Geolocation requires a secure context. It works on localhost during development and on HTTPS when deployed. If permission is declined or weather retrieval fails, the experience continues with its default atmosphere.

## Validate

```bash
npm run build
npm run test:sites
```

The production client is emitted to `dist/client`; the included worker and hosting metadata make the project ready for a later Sites deployment.

## Controls

- `M`: mute or unmute ambient audio
- `L`: request location and refresh the weather

## Privacy

Coordinates are sent directly from the visitor's browser to Open-Meteo to retrieve current weather. They are not stored by this project.
