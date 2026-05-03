# Team 37X — Xtra Hot Chilli Peppers

Sponsorship site for VEX V5 Robotics Team 37X (Ontario, Canada). A static, single-page site built to convert prospective sponsors who land on it from a jersey, a packet, or a cold email.

**Live:** TBD (GitHub Pages once enabled — `https://sopie-k10.github.io/vex37/`)

## What this is

- Single page, static HTML/CSS/JS — no framework, no build step
- Mobile-first responsive layout
- Hosted on GitHub Pages directly from the `main` branch
- Sections: Hero · Stats · Story + Budget · Achievements · Team · Sponsor Tiers · Current Sponsors · Contact

## Repo layout

```
.
├── index.html         # the page
├── css/styles.css     # all styles, single file, CSS custom properties
├── js/app.js          # tiny, just for nav scroll state + section fade-in
├── assets/img/        # team photos, logo, robot, achievement shots
├── .github/workflows/ # GitHub Pages deploy
└── README.md
```

## Editing

The whole site is plain HTML. To update copy or sections:

1. Open `index.html` in any editor.
2. Find the section (each section is wrapped in an HTML comment block at the top, e.g. `<!-- ── HERO ── -->`).
3. Edit text directly. Save.
4. `git commit -am "update X"` and `git push` — GitHub Pages auto-deploys from `main` within a minute.

To swap an image, replace the file in `assets/img/` keeping the same filename, or update the `<img src>` reference in the HTML.

## Sponsor tier CTAs

Each tier card has a `mailto:` link with a pre-filled subject line (tier name included). When a sponsor taps "Sponsor at Gold" their mail client opens with `Subject: 37X Sponsorship - Gold Chassis Tier` already populated. No backend, no form-handling service required.

## Branding

| Color        | Hex       | Use                         |
| ------------ | --------- | --------------------------- |
| Background   | `#0c0a09` | Page background             |
| Pepper red   | `#e23e3e` | Primary brand               |
| Hot orange   | `#ff6b35` | CTA gradients, accents      |
| Heat yellow  | `#ffb800` | Stats, highlights           |
| Cream        | `#f5e9d4` | Body text                   |

Type: **Bebas Neue** (display) + **Inter** (body) + **Space Grotesk** (numbers/labels).

## Local preview

Python's stdlib server is enough:

```bash
cd /path/to/vex37
python3 -m http.server 8080
# open http://localhost:8080
```

Or, on Friday, the site is symlinked into Apache at `/var/www/html/vex37`.

## License

Site code: MIT. Photos and team brand: © Team 37X / their respective members.
