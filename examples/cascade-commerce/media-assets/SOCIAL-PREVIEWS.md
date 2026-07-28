# Social preview specifications

## Social preview

- Canvas: 1200×630 px, PNG, sRGB.
- Safe area: 72 px on every edge.
- Background: `#020617`, with a subtle cyan radial glow at 75%/25%.
- Left column (600 px): Cascade mark at 72×72; headline “See the blast radius
  before you merge” in 58 px/64 px bold; subhead “Dependency intelligence for
  polyglot repositories” in 28 px/36 px.
- Right column (420×486): crop from the real dashboard overview showing graph,
  risk, cycle, and dead-code cards. Use a 16 px radius and 1 px `#334155` border.
- Accent: `#22D3EE`; primary text `#F8FAFC`; secondary text `#94A3B8`.
- No terminal path, token, invented count, or claim beyond the captured result.

## Repository Open Graph image

- Canvas: 1280×640 px, PNG, sRGB.
- Safe area: 80 px horizontal, 64 px vertical.
- Top-left: Cascade mark and wordmark, 48 px cap height.
- Center: “Architecture answers from the code you have” in 54 px/60 px bold.
- Bottom: three 300×120 px evidence cards labeled “Dependency graph”, “Change
  impact”, and “Architecture rules”. Populate counts only from a freshly
  generated `dashboard.json`; otherwise omit counts.
- Background and palette match the social preview.
- Export at 1× with metadata stripped; verify legibility at 600×300.
