# Deployment setup

This folder contains `deploy.yml`, a GitHub Actions workflow that:

- Runs **unit tests** (Vitest) and **acceptance tests** (Cucumber) on every push and PR to `develop` or `main`.
- On push to **`develop`** — builds with `ng build --configuration production` and deploys to **GitHub Pages**.
- On push to **`main`** — builds with `ng build --configuration production` and deploys to **cPanel via FTPS**.

Both deploy jobs `needs: test`, so a red test blocks deploys.

---

## ⚠️ Important caveats

1. **GitHub Pages SPA routing.** GH Pages has no SPA fallback. The workflow copies `index.html` to `404.html` after build so deep links resolve — that's the standard trick.
2. **Firebase Auth authorized domains.** The new hostnames (`<user>.github.io` and your cPanel domain) must be added in the Firebase console or Google sign-in throws `auth/unauthorized-domain`. See step E below.
3. **Base href on GH Pages.** Repo is served at `https://<user>.github.io/<repo>/`, so the workflow passes `--base-href "/<repo>/"`. If you later switch to a custom domain or a user/org page (`<user>.github.io`), drop that flag.
4. **Service worker scope** must match the base href, otherwise the installed PWA lives at the wrong scope. The base-href flag handles this.
5. **One Firebase project for two environments.** Both `develop` and `main` currently point at the same Firestore. Develop traffic pollutes production data — consider a second Firebase project for staging if this matters. (Requires build-time env injection — separate task.)

---

## 1. Repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `FTP_HOST` | cPanel host, e.g. `ftp.yourdomain.com` |
| `FTP_USERNAME` | cPanel FTP user (create a dedicated one in cPanel → FTP Accounts, scoped to the deploy folder) |
| `FTP_PASSWORD` | That user's password |
| `FTP_REMOTE_DIR` | Target directory, e.g. `/public_html/` or `/public_html/shopping/` |

Never reuse your main cPanel password. Create a dedicated FTP user scoped to the deploy folder only.

---

## 2. Enable GitHub Pages

1. Repo → **Settings → Pages**
2. **Source**: *GitHub Actions* (not "Deploy from a branch")
3. After the first successful deploy from `develop`, the live URL appears on that settings page.

---

## 3. Protect `main` (recommended)

Repo → **Settings → Environments → New environment** → name it `production`. Add yourself as a required reviewer — cPanel deploys then need a manual approval click before uploading. The workflow already references `environment: production` in the cPanel job.

---

## 4. cPanel setup

### FTP account
- cPanel → **FTP Accounts** → create a user with directory restricted to the deploy folder.
- Enable TLS/SSL (usually default). The workflow uses `protocol: ftps`.

### SPA routing (Apache `.htaccess`)

cPanel runs Apache. Drop a `.htaccess` into the deploy folder so unknown routes fall through to `index.html`:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# PWA manifest MIME type (cPanel sometimes serves it as text/plain)
AddType application/manifest+json .webmanifest
```

Either commit this to `frontend/public/.htaccess` so Angular bundles it into `dist/` on every build, or upload it manually once.

---

## 5. Firebase Auth — authorize the new domains

Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** for each:

- `<your-github-username>.github.io` (or your custom GH Pages domain)
- `yourdomain.com` (cPanel)

Without this, Google sign-in fails with `auth/unauthorized-domain`.

---

## 6. Firebase config is in the bundle — that's fine

`app.config.ts` ships the Firebase web config (apiKey, authDomain, projectId, etc.) in the JS bundle. These values are public by design — security comes from Firestore rules and the authorized-domains list. No action needed unless you want a separate Firebase project per environment.

---

## 7. Branch hygiene

- Feature branches → PR into `develop` → tests run on PR → merge → auto-deploys to GH Pages.
- When `develop` is stable → PR `develop` → `main` → tests run → on merge, FTP deploys to cPanel (pending approval if you set up the `production` environment).

---

## 8. Switching cPanel from FTP to Git

If cPanel enables "Git Version Control" (most modern cPanel hosts do), you can replace the FTP job with a simple push:

```yaml
- name: Deploy via Git push to cPanel
  run: |
    git config user.email "ci@example.com"
    git config user.name "CI"
    git remote add cpanel "https://${{ secrets.CPANEL_GIT_USER }}:${{ secrets.CPANEL_GIT_TOKEN }}@git.yourdomain.com/repo.git"
    git push cpanel HEAD:main --force
```

Then configure the cPanel repo's `.cpanel.yml` to copy `frontend/dist/frontend/browser/**` into `public_html/`. Ask when you're ready to switch and I'll adapt this.

---

## 9. Things that will bite you

- **First Pages deploy**: ~2 min DNS propagation after the action turns green. Don't panic at a 404.
- **Service worker stale cache**: after a deploy, users with the PWA installed may need one hard reload to pick up the new SW. `ngsw-config.json`'s prefetch strategy handles subsequent updates automatically.
- **`--base-href` mismatch**: if the repo is `pwa-shopping-list`, GH Pages serves at `/pwa-shopping-list/`. Drop the trailing slash and routing breaks.
- **FTP rate limits**: many cPanel hosts throttle connections. `dangerous-clean-slate: false` (default here) does incremental uploads so you stay under the limit.
- **Firestore rules must be deployed separately.** The workflow does *not* touch Firestore rules or indexes. Run `firebase deploy --only firestore:rules,firestore:indexes` from `backend/firebase/` manually when they change.

---

## 10. Test the pipeline before trusting it

1. Push a trivial change to a feature branch → PR to `develop` → verify tests run and pass.
2. Merge the PR → verify `build-pages` + `deploy-pages` run and the live site updates.
3. PR `develop` → `main` → merge → approve the `production` environment → verify cPanel upload succeeds and the live site on your domain updates.
