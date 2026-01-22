# Git Remotes Configuration

**Date:** 2025-11-23
**Purpose:** Document which remotes to push to and why

---

## Primary Remote (Vercel Connected)

**Remote:** `origin`
**URL:** `https://github.com/growthpigs/bravo-revos.git`
**Vercel:** ✅ CONNECTED
**Usage:** Push here FIRST - Vercel watches this repo for auto-deployment

```bash
git push origin main
```

---

## Secondary Remote (Team Collaboration)

**Remote:** `agro-bros`
**URL:** `https://github.com/agro-bros/bravo-revos.git`
**Vercel:** ❌ Not connected
**Usage:** Sync here for team collaboration and backup

```bash
git push agro-bros main
```

---

## Other Remotes

**Remote:** `bolt`
**URL:** `https://github.com/growthpigs/bolt-bravo-revos.git`
**Purpose:** Bolt.new experimental fork (not actively used)

---

## Push Strategy

**Standard workflow:**
```bash
git push origin main          # Triggers Vercel deployment
git push agro-bros main       # Syncs to team repo
```

**Or push to both:**
```bash
git push origin main && git push agro-bros main
```

---

## Vercel Project Info

**Project ID:** prj_ROGcaDaG7yBPtaRc4Y8ShBcOGI3L
**Org ID:** team_HM0E4qdvAvGzJAP0LKvweHrt
**Project Name:** bravo-revos
**Connected Repo:** growthpigs/bravo-revos (origin)

---

## Important

⚠️ **ALWAYS push to `origin` first** - That's where Vercel deploys from!

If you're unsure which remote Vercel uses:
1. Go to https://vercel.com/agro-bros/bravo-revos
2. Click Settings → Git
3. Confirm it shows: growthpigs/bravo-revos
