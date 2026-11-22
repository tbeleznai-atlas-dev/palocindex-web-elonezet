# PalócIndex: ismételhető, díjmentes éles kiadás

Ez a tárhelyváltás a nyilvános statikus PalócIndex oldalt GitHub Pages-en szolgálja ki. A Rackhostnál látható tárhelycsomag befizetése nem része ennek az útvonalnak. A Sites jelenlegi `palocindex.hu` kiadása a DNS átállításáig változatlanul működik.

## Egyszeri beállítás a kiadási PR összeolvasztása után

1. A GitHub tárban nyisd meg a **Settings → Pages** oldalt, és a **Build and deployment → Source** mezőnél válaszd a **GitHub Actions** lehetőséget.
2. A **Custom domain** mezőbe írd be: `palocindex.hu`, majd mentsd el. A GitHub által kért domain-ellenőrző TXT rekordot a Rackhost DNS-ben kell létrehozni, mielőtt a cím forgalmát átirányítanád.
3. Ha a GitHub visszaigazolta a domaint, a Rackhost DNS-ben állítsd a gyökérdomaint (`@`) erre a négy A rekordra: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. A `www` host legyen CNAME a `tbeleznai-atlas-dev.github.io` címre. Cseréld le az ezekkel ütköző régi webes rekordokat; az NS- és MX-rekordokat, valamint az e-mailhez használt rekordokat hagyd meg.
4. Várd meg, amíg a GitHub Pages DNS-ellenőrzése sikeres, és a HTTPS elérhetővé válik. Ezután a tár **Settings → Secrets and variables → Actions → Variables** részén hozd létre a `PALOCINDEX_CUSTOM_DOMAIN_READY` változót `true` értékkel.
5. Az Actions oldalon futtasd le a `Validate and publish PalócIndex` munkafolyamatot a `main` ágról. A kiadás csak akkor fut le, ha a domain-kapu is be van kapcsolva.

A DNS célcímeket és a sorrendet a [GitHub Pages egyéni domain útmutatója](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) írja le. A Pages egyéni domainjét előbb a GitHubon kell beállítani, és csak utána szabad a DNS-t átirányítani.

## Későbbi frissítések

Az ellenőrzött nyilvános statikus tartalom a `pages-source/` könyvtárban van. Frissítés előtt a release-jelöltet át kell másolni a `pages-source/` könyvtárba a meglévő `ops.publication.sync_github_pages_source` ellenőrzővel, majd felülvizsgálható PR-ban kell `main`-be vezetni. A PR ellenőrzi a 131 települést, a hat járást, a helyi útvonalakat és a szerveroldali fájlok kizárását. A `main`-re történő beolvasztás után a GitHub Actions automatikusan frissíti a nyilvános oldalt.

## Adat- és biztonsági határ

Kizárólag statikus, nyilvános oldalfájlok kerülnek ki. Nincs adatbázis, szerverkód, regisztráció, hirdetésfeladás, fizetés vagy üzenetküldés. Az ütemezett hír-, időjárás- és forgalomfrissítők külön fejlesztési feladatok; ez a kiadási folyamat önmagában csak a jóváhagyott statikus jelölteket teszi közzé.
