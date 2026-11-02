# Bach

**English** | [简体中文](README.zh-CN.md)

> **Estimates only — not tax advice.** Bach is not affiliated with or endorsed by Inland Revenue (IRD) or ACC. Figures are estimates to help you set money aside; IRD's own calculation is what counts. It does not include tax credits, student loan, Working for Families or other adjustments. Use at your own risk.

Bach is a free, open-source, local-first tool for people in New Zealand with a **PAYE salary plus self-employed (sole trader) side income**. Each time a side payment lands, it tells you how much to move to your tax account; at year end it gives you the numbers for your IR3.

*A bach (say "batch") is a Kiwi holiday hut. Get the admin done, then go to the bach.*

## Use it

**👉 [sdua078.github.io/bach](https://sdua078.github.io/bach/)**

Nothing to download, no account. It runs in your browser on a computer or phone.

1. **Open the link.** Read the note, enter your expected yearly salary.
2. **Install it as an app** (recommended — keeps your data safe):
   - Chrome / Edge: click the install icon in the address bar
   - Safari on Mac: File → Add to Dock
   - iPhone: Share → Add to Home Screen
3. **Record as you go.**
   - *Income*: type the NZD that landed and press Enter. Bach shows how much to move to your tax account; record what you actually moved.
   - *Expenses*: item, category, amount and how much of it was for side work.
   - *Home office*: fill in rent, floor area and bills once.
4. **Check Summary** for how much is still to set aside.
5. **Export a backup** from Settings every month or so, and keep it in iCloud / Google Drive.

## Your data

- Stored only in your browser on your device. No server, no bank connection, nothing uploaded.
- Each browser on each device has its own separate data. To move to another device, export a backup and import it there (Settings → Import backup). Importing replaces everything on that device.
- Safari can clear website data that hasn't been used for a while — install Bach as an app and keep backups.

## What it does (v0.1)

- Income and expenses for the 2026-27 tax year, with business-use share
- Home office deduction (rent, power & gas, internet)
- Extra income tax on top of PAYE, ACC levy estimate, how much is still to set aside
- Provisional tax heads-up when residual income tax goes over the threshold
- English and Simplified Chinese, light and dark mode, desktop and phone layouts

---

## For developers

Only needed if you want to change the code. Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit tests (calculations + data layer)
pnpm build
```

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

[GNU AGPL-3.0](LICENSE). You're free to use, study, change and share Bach. If you distribute a modified version, or run one as a service for others, you must release your full source code under the same licence.
