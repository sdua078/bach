# Bach

> **Estimates only — not tax advice.** Bach is not affiliated with or endorsed by Inland Revenue (IRD) or ACC. Figures are estimates to help you set money aside; IRD's own calculation is what counts. It does not include tax credits, student loan, Working for Families or other adjustments. Use at your own risk.
>
> **仅为估算，不构成税务建议。** Bach 与新西兰税务局（IRD）和 ACC 无关。结果仅供参考，以 IRD 实际计算为准。

Bach is a free, open-source, local-first tool for people in New Zealand with a **PAYE salary plus self-employed (sole trader) side income**. Each time a side payment lands, it tells you how much to move to your tax account; at year end it gives you the numbers for your IR3.


## Privacy

- No account, no server, no bank connection.
- Everything is stored in your browser (IndexedDB) on your device. Nothing is uploaded.
- Back up by exporting a JSON file (Settings → Export backup) to iCloud / Google Drive.
- On iPhone, **add Bach to your Home Screen**; Safari may clear website data that hasn't been used for a while.

## What it does (v0.1)

- Income and expenses for the 2026-27 tax year, with business-use share
- Home office deduction (rent, power & gas, internet)
- Extra income tax on top of PAYE, ACC levy estimate, how much is still to set aside
- Provisional tax heads-up when residual income tax goes over the threshold
- English and 简体中文

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit tests (calculations + data layer)
pnpm build
```

Project layout:

| Path | What |
|---|---|
| `src/tax-rules/nz-YYYY-YY.json` | All tax rates, thresholds and dates, with official source links. The only place tax numbers live. |
| `src/calc/` | Pure calculation functions, in integer cents, fully unit-tested |
| `src/db/` | Dexie (IndexedDB) schema and `repo.ts`, the only way the UI touches data |
| `src/platform/` | Web implementations of file, storage and device APIs (swap for native later) |
| `src/i18n/` | Typed dictionaries; `zh.ts` must match `en.ts` key for key |
| `src/pages/`, `src/components/` | UI |

### Adding a new tax year

1. Copy the latest `src/tax-rules/nz-YYYY-YY.json`, update every number from IRD / ACC, and update `sources`.
2. Register it in `src/tax-rules/index.ts`.
3. Add tests for the new brackets in `src/calc/incomeTax.test.ts`.

### Deploying

Pushing to `main` runs tests, builds with `BACH_BASE=/<repo>/` and publishes to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Licence

[MIT](LICENSE)
