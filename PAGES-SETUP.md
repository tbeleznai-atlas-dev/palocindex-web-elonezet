# PalócIndex Pages előnézet

Ez a külön GitHub Pages-előnézet a PalócIndex nyilvános statikus fájljait szolgálja ki. Nem változtatja meg a `palocindex.hu` DNS-beállítását; a jelenlegi éles oldal ettől függetlenül működik tovább.

## Egyszeri aktiválás

1. A GitHubon nyisd meg a `tbeleznai-atlas-dev/palocindex-web-elonezet` tár **Settings → Pages** oldalát.
2. A **Build and deployment → Source** mezőnél válaszd a **GitHub Actions** lehetőséget.
3. A felülvizsgálat után olvaszd be a Pages-kiadási PR-t a `main` ágba.
4. Az Actions oldalon ellenőrizd a sikeres `Validate and publish PalócIndex preview` futást.

Az előnézet címe: `https://tbeleznai-atlas-dev.github.io/palocindex-web-elonezet/`.

## Frissítés

Az aktuális statikus kiadás ellenőrzött `dist/` könyvtárából így készül a Pages-forrástükör:

```powershell
python -m ops.publication.sync_github_pages_source --source-dir dist --target-dir pages-source --base-path /palocindex-web-elonezet/
```

A parancs ellenőrzi a közzétehető fájltípusokat, a 131 települést és a hat járást, előnézeti csomagot épít a hivatkozások ellenőrzésére, kizárja a `server/` fájlokat, majd csak sikeres ellenőrzés után cseréli le a forrástükröt. Ez a helyi lépés nem publikál.

Ezután a `pages-source/` változásait felülvizsgálható PR-ban kell a Pages-tárba átvezetni. A PR ellenőrzi a mobilos almappa-útvonalakat, a helyi hivatkozásokat és a Worker-kód kizárását. A Pages csak a `main` ágba került változás után települ. A kiadási feladat kizárólag az előnézetet frissíti; nem állít át domaint.

## Saját domain kiadási csomagjának előkészítése

Ha később jóváhagyott tárhelyváltás készül, a gyökérútvonalú és indexelhető csomag külön, helyben ellenőrizhető:

```powershell
python ops/publication/build_github_pages.py --source-dir dist --output-dir tmp/pages-domain-candidate --base-path / --allow-indexing
```

Ez a parancs csak helyi jelöltet készít. Az `--allow-indexing` kizárólag `/` útvonalon működik, és `robots.txt`-ben megköveteli a kifejezett `Allow: /` szabályt. DNS-t, Pages-beállítást és éles weboldalt nem módosít.

Az előnézet robots.txt-je tiltja a keresőindexelést, és nem tartalmaz hirdetésfeladási, fiók- vagy fizetési funkciót. A jelenlegi kiadás ellenőrzött forrású statikus tartalmat használ; ha egy frissítés jelöltje hiányzik, az oldal saját ellenőrzött üres állapotot mutat.
