# PalócIndex Pages előnézet

Ez a külön GitHub Pages-előnézet a PalócIndex nyilvános statikus fájljait szolgálja ki. Nem változtatja meg a `palocindex.hu` DNS-beállítását; a jelenlegi éles oldal ettől függetlenül működik tovább.

## Egyszeri aktiválás

1. A GitHubon nyisd meg a `tbeleznai-atlas-dev/palocindex-web-elonezet` tár **Settings → Pages** oldalát.
2. A **Build and deployment → Source** mezőnél válaszd a **GitHub Actions** lehetőséget.
3. A felülvizsgálat után olvaszd be a Pages-kiadási PR-t a `main` ágba.
4. Az Actions oldalon ellenőrizd a sikeres `Validate and publish PalócIndex preview` futást.

Az előnézet címe: `https://tbeleznai-atlas-dev.github.io/palocindex-web-elonezet/`.

## Frissítés

Az új statikus fájlokat a `pages-source/` mappába kell tenni, majd PR-t nyitni. A PR ellenőrzi a mobilos almappa-útvonalakat, a helyi hivatkozásokat és a Worker-kód kizárását. A Pages csak a `main` ágba került változás után települ. A kiadási feladat kizárólag az előnézetet frissíti; nem állít át domaint.

Az előnézet robots.txt-je tiltja a keresőindexelést, és nem tartalmaz hirdetésfeladási, fiók- vagy fizetési funkciót. A jelenlegi kiadás ellenőrzött forrású statikus tartalmat használ; ha egy frissítés jelöltje hiányzik, az oldal saját ellenőrzött üres állapotot mutat.
