# mox-site

The official portal for the **MoX series** (Chinese + English).

- Live site: https://codecloud-dev.github.io/mox-site/
- Bilingual: [`index.html`](index.html) (中文) · [`index.en.html`](index.en.html) (English)

## What's inside

A single static page (no build step) presenting **moxsh** — the liquid-glass terminal for Android. It is built as a self-contained `index.html` + `style.css` pair so it can be served straight from GitHub Pages.

Design notes:

- **Liquid-glass** surfaces: real-time blur, top specular highlight, refractive edge, pointer-following glow, and a slow-moving ambient sheen.
- **Device preview** that tilts with pointer / gyroscope for a real-device feel.
- **Human verification gate**: when a visit looks abnormal (headless / bot UA / missing capabilities), a slide-to-verify panel appears before the page — no quiz, just a gesture. Pass state is remembered for the session.
- **Support CTA**: a Star / follow / share prompt, because small indie projects live on visibility.

## Local preview

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

Append `?verify=1` to the URL to force the verification gate for testing.

## License

Same as the series: [GPL-3.0](../../LICENSE).
