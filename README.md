# CalculaRàpid — Automatismes de Càlcul Mental

Aplicació educativa per practicar sumes, diferències i multiplicacions amb nombres inferiors a 12, preguntes indirectes (p. ex. `5 + ? = 8`, `10 − ? = 3`, `2 × ? = 6`), 5 nivells progressius de dificultat i temps, i un sistema de recompenses.

## Publicació a GitHub Pages

El projecte ja està configurat amb rutes relatives (`base: './'` a `vite.config.ts`) i un flux automàtic a `.github/workflows/deploy.yml`.

1. Crea un repositori nou a GitHub (p. ex. `calcularapid`).
2. Puja el codi a la branca `main`:
   ```bash
   git init
   git add .
   git commit -m "Versió inicial CalculaRàpid"
   git branch -M main
   git remote add origin https://github.com/<EL_TEU_USUARI>/<EL_TEU_REPO>.git
   git push -u origin main
   ```
3. A GitHub, ves a **Settings → Pages → Build and deployment → Source** i selecciona **GitHub Actions**.
4. Quan l'acció finalitzi (1–2 minuts), obtindràs l'enllaç públic per compartir amb l'alumnat:
   `https://<EL_TEU_USUARI>.github.io/<EL_TEU_REPO>/`

## Enllaços personalitzats per a l'alumnat

Pots usar el botó **Copiar enllaç amb aquesta configuració** dins l'aplicació o afegir paràmetres a l'URL:
- `?ops=sum,diff,mul&mode=indirect&tier=1&q=10`

## Registre de resultats a Google Sheets

L'aplicació envia automàticament cada ronda completada a l'endpoint configurat de Google Apps Script (`google-apps-script/Code.gs`), creant i omplint un full separat per a cada curs (`1r d'ESO`, `2n d'ESO`, `3r d'ESO` i `4t d'ESO`). Pots canviar l'enllaç `/exec` definint `VITE_SHEETS_EXEC_URL` abans de compilar.

