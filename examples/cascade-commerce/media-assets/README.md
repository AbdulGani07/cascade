# Demo media assets

All captures use the generated `.cascade-demo` repository and the real Cascade
CLI. Keep browser zoom at 100%, terminal text at 20–22 px, and crop out the
tokenized dashboard URL.

| Asset                     | Dimensions | Exact content                                                          |
| ------------------------- | ---------: | ---------------------------------------------------------------------- |
| `readme-hero.png`         |   1600×900 | Dashboard overview, sidebar visible, graph centered, no browser chrome |
| `dashboard-overview.png`  |   1440×900 | Overview cards and complete sidebar                                    |
| `cycle-explorer.png`      |   1440×900 | Cycles view with the pricing cycle selected                            |
| `pull-request-report.png` |   1440×900 | Pull-request impact for `demo-base...pr/new-cycle`                     |
| `architecture-rule.png`   |   1440×900 | Violations view showing `domain-must-not-import-web`                   |

Capture commands:

```bash
node examples/cascade-commerce/scripts/setup-demo.mjs
node packages/cli/dist/index.js dashboard .cascade-demo \
  --base demo-base --head pr/new-cycle --no-open \
  --output examples/cascade-commerce/media-assets/generated/dashboard.json \
  --url-output .cascade-demo/dashboard-url.txt
```

Do not substitute mock data. If a UI label or count changes after a Cascade
release, regenerate the repository, recapture the dashboard, and update the
caption rather than editing the screenshot.
Delete `dashboard-url.txt` after capture because it contains the temporary local
access token.

After capturing the five named assets, normalize their PNG encoding and exact
canvas sizes without resampling:

```powershell
powershell -NoProfile -File examples/cascade-commerce/scripts/normalize-media.ps1
```

See [SOCIAL-PREVIEWS.md](SOCIAL-PREVIEWS.md) for production-ready layout specs.
