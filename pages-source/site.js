/* PalócIndex V9 client: same-origin content only, no third-party requests or advertising trackers. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const setText = (node, value) => { if(node) node.textContent = value; };
  const scheduleFreshnessExpiry = (expiresAt, callback) => {
    if(typeof setTimeout !== "function" || !Number.isFinite(expiresAt)) return;
    const check=()=>{
      const remaining=expiresAt-Date.now();
      if(remaining>0){setTimeout(check,remaining);return;}
      callback();
    };
    setTimeout(check,Math.max(0,expiresAt-Date.now()));
  };
  const townSel = document.querySelectorAll("[data-town-select]");
  let towns = [];
  const collate = new Intl.Collator("hu", {sensitivity:"base"});
  let selectedTown = (() => { try { return localStorage.getItem("paloc_town") || ""; } catch(_){return "";} })();
  const remember = t => {selectedTown=t;try {localStorage.setItem("paloc_town",t);} catch(_){} };
  const syncTownRadios = () => {
    const radios=[...(el("municipality-cards")?.querySelectorAll("button")||[])];
    const selected=radios.find(x=>x.dataset.town===selectedTown) || radios[0];
    radios.forEach(x=>{
      x.setAttribute("aria-checked",String(x.dataset.town===selectedTown));
      x.tabIndex=x===selected?0:-1;
    });
  };
  const normalizeSearch = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu");
  const sanitizePublicLink = str => {
    try {
      const u = new URL(str);
      if(u.protocol !== "https:" && u.protocol !== "http:") return "";
      if(u.username || u.password) return "";
      return u.href;
    } catch(_) { return ""; }
  };
  const validCheckDate = value => {
    if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year,month,day]=value.split("-").map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day;
  };
  const hasVerifiedOfficialWebsite = town => {
    const official=town?.official_website;
    return Boolean(!town?.website_review && official?.review_status!=="security_hold" && sanitizePublicLink(official?.url) && sanitizePublicLink(official?.source) && validCheckDate(official?.checked_on));
  };
  function chooseTown(t) {
    remember(t);
    townSel.forEach(x=>{ if([...x.options].some(o=>o.value===t)) x.value=t; });
    syncTownRadios();
    const heading=el("municipality-title");
    if(heading) {
      heading.textContent=t;
      const entry=towns.find(x=>x.name===t);
      setText(el("municipality-district"), entry ? entry.district : "Nógrád vármegye");
      setText(el("municipality-info"), entry?.website_review?.note || "Az önkormányzat ügyfélfogadási adatai és hivatalos hírei feltöltés alatt állnak.");
      const official=entry?.official_website;
      const officialUrl=sanitizePublicLink(official?.url || "");
      const sourceUrl=sanitizePublicLink(official?.source || "");
      const officialInfo=el("municipality-official-info");
      const officialLink=el("municipality-official-link");
      const officialSource=el("municipality-official-source");
      const verifiedOfficial=hasVerifiedOfficialWebsite(entry);
      if(officialInfo) officialInfo.hidden=!verifiedOfficial;
      if(officialLink) officialLink.href=verifiedOfficial ? officialUrl : "#";
      if(officialSource) officialSource.href=verifiedOfficial ? sourceUrl : "#";
      setText(el("municipality-official-date"), official?.checked_on || "");
      const contact=entry?.official_contact_page;
      const contactUrl=sanitizePublicLink(contact?.url || "");
      const contactSource=sanitizePublicLink(contact?.source || "");
      const contactInfo=el("municipality-contact-info");
      const contactLink=el("municipality-contact-link");
      const contactDate=el("municipality-contact-date");
      const hasVerifiedContact=Boolean(contactUrl.startsWith("https://") && contactSource.startsWith("https://") && validCheckDate(contact?.checked_on) && typeof contact?.label==="string" && contact.label.trim());
      if(contactInfo) contactInfo.hidden=!hasVerifiedContact;
      if(contactLink) contactLink.href=hasVerifiedContact ? contactUrl : "#";
      setText(contactLink, hasVerifiedContact ? contact.label : "");
      setText(contactDate, hasVerifiedContact ? contact.checked_on : "");
      const registry=entry?.official_registry;
      const registryUrl=sanitizePublicLink(registry?.url || "");
      const registrySource=sanitizePublicLink(registry?.source || "");
      const registryInfo=el("municipality-registry-info");
      const registryLink=el("municipality-registry-link");
      const registryDate=el("municipality-registry-date");
      const registrySourceLink=el("municipality-registry-source");
      const hasVerifiedRegistry=Boolean(registryUrl.startsWith("https://") && registrySource.startsWith("https://") && validCheckDate(registry?.checked_on) && typeof registry?.label==="string" && registry.label.trim());
      if(registryInfo) registryInfo.hidden=!hasVerifiedRegistry;
      if(registryLink) registryLink.href=hasVerifiedRegistry ? registryUrl : "#";
      if(registrySourceLink) registrySourceLink.href=hasVerifiedRegistry ? registrySource : "#";
      setText(registryLink, hasVerifiedRegistry ? registry.label : "");
      setText(registryDate, hasVerifiedRegistry ? registry.checked_on : "");
      const query=encodeURIComponent(t+" önkormányzat hivatalos honlap");
      const googleSearch=el("municipality-search-google");
      if(googleSearch) googleSearch.href="https://www.google.com/search?q="+query;
      const bingSearch=el("municipality-search-bing");
      if(bingSearch) bingSearch.href="https://www.bing.com/search?q="+query;
      const detail=el("municipality-detail");
      if(detail) detail.hidden=false;
    }
  }
  async function loadTowns(){
    const retry=el("town-retry");
    if(retry) { retry.hidden=true; retry.disabled=true; }
    setText(el("municipalities-status"), "Települések betöltése…");
    try{
      const r=await fetch("/nograd-telepulesek.json");
      if(!r.ok) throw new Error("Town list unavailable");
      const data=await r.json();
      const expectedTownCount=data?.official_reference?.verified_town_count;
      const expectedDistrictCount=data?.official_reference?.verified_district_count;
      if(!Array.isArray(data.towns) || !data.towns.length ||
         data.towns.some(t=>!t || typeof t.name!=="string" || !t.name.trim() ||
                            typeof t.district!=="string" || !t.district.trim()) ||
         new Set(data.towns.map(t=>t.name)).size!==data.towns.length ||
         !Number.isInteger(expectedTownCount) || data.towns.length!==expectedTownCount ||
         !Number.isInteger(expectedDistrictCount) ||
         new Set(data.towns.map(t=>t.district)).size!==expectedDistrictCount)
        throw new Error("Invalid town list");
      towns=data.towns;
    }catch(_){
      setText(el("municipalities-status"),"A településlista átmenetileg nem érhető el. Próbáld újra.");
      if(retry) { retry.hidden=false; retry.disabled=false; }
      return false;
    }
    towns.sort((a,b)=>collate.compare(a.name,b.name));
    townSel.forEach(select=>{
      const placeholder=new Option("Válassz települést…","");
      select.appendChild(placeholder);
      towns.forEach(t=>select.appendChild(new Option(t.name,t.name)));
      if(selectedTown && towns.some(t=>t.name===selectedTown))select.value=selectedTown;
      select.addEventListener("change",()=>select.value && chooseTown(select.value));
    });
    const districts=el("district-filter");
    if(districts){
      districts.appendChild(new Option("Minden járás",""));
      [...new Set(towns.map(t=>t.district))].sort(collate.compare).forEach(d=>districts.appendChild(new Option(d,d)));
    }
    if(el("municipality-cards")) {
      const cardArea=el("municipality-cards");
      cardArea.setAttribute("role","radiogroup");
      cardArea.setAttribute("aria-label","Település kiválasztása");
      const text=el("town-query");
      const reset=el("town-filters-reset");
      const render=()=>{
        const s=normalizeSearch((text?.value||"").trim());
        const district=districts?.value||"";
        const exactTownMatches=s?towns.filter(t=>normalizeSearch(t.name)===s&&(!district||t.district===district)):[];
        const matches=exactTownMatches.length?exactTownMatches:towns.filter(t=>(!s||normalizeSearch(t.name+" "+t.district).includes(s))&&(!district||t.district===district));
        if(s){
          const rank=t=>{
            const name=normalizeSearch(t.name);
            return name===s ? 0 : name.startsWith(s) ? 1 : name.includes(s) ? 2 : 3;
          };
          matches.sort((a,b)=>rank(a)-rank(b)||collate.compare(a.name,b.name));
        }
        cardArea.replaceChildren();
        matches.forEach(t=>{
          const b=document.createElement("button");
          b.type="button";b.className="v9-town";b.dataset.town=t.name;b.textContent=t.name;
          const sm=document.createElement("small");
          sm.textContent=t.district;
          b.appendChild(sm);
          b.setAttribute("role","radio");
          b.setAttribute("aria-checked",String(selectedTown===t.name));
          b.tabIndex=selectedTown===t.name?0:-1;
          b.addEventListener("click",()=>{
            chooseTown(t.name);
            const detail=el("municipality-detail");
            const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            detail?.scrollIntoView({behavior:reduceMotion ? "auto" : "smooth",block:"start"});
            el("municipality-title")?.focus({preventScroll:true});
          });
          b.addEventListener("keydown",event=>{
            const radios=[...cardArea.querySelectorAll("button")];
            const current=radios.indexOf(b);
            let next=current;
            if(event.key==="ArrowRight"||event.key==="ArrowDown")next=(current+1)%radios.length;
            else if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=(current-1+radios.length)%radios.length;
            else if(event.key==="Home")next=0;
            else if(event.key==="End")next=radios.length-1;
            else return;
            event.preventDefault();
            const destination=radios[next];
            chooseTown(destination.dataset.town);
            destination.focus();
          });
          cardArea.appendChild(b);
        });
        syncTownRadios();
        setText(el("municipalities-status"),matches.length ? matches.length+" település a "+towns.length+"-ből" : "Nincs találat. Próbálj másik nevet vagy járást.");
        if(reset) reset.hidden=!(s || district);
      };
      text?.addEventListener("input",render);
      districts?.addEventListener("change",render);
      reset?.addEventListener("click",()=>{
        if(text) text.value="";
        if(districts) districts.value="";
        render();
        text?.focus();
      });
      render();
      if(selectedTown && towns.some(t=>t.name===selectedTown))chooseTown(selectedTown);
    }
    setText(el("all-towns-counter"), String(towns.length));
    setText(el("district-counter"), String(new Set(towns.map(t=>t.district)).size));
    const verifiedWebsiteCount=towns.filter(hasVerifiedOfficialWebsite).length;
    setText(el("official-website-count"), String(verifiedWebsiteCount));
    setText(el("official-website-pending-count"), String(towns.length-verifiedWebsiteCount));
    return true;
  }
  function loadAds(){
    const target=el("published-ads");
    if(!target) return;
    target.replaceChildren();
    const p=document.createElement("p");
    p.className="v9-info";
    p.textContent="A jóváhagyott helyi hirdetések az éles indulás után jelennek meg.";
    target.appendChild(p);
  }
  function loadNationalNews(){
    const status=el("national-news-status");
    const target=el("national-news-items");
    const placeholder=el("national-news-placeholder");
    if(!status || !target || !placeholder) return;
    const allowedHosts={"ksh-news":["www.ksh.hu"],"ksh-quick-reports":["www.ksh.hu"],"police-nograd-facts":["www.police.hu"],"police-national-facts":["www.police.hu"]};
    const safeNewsUrl=(value,sourceId)=>{
      try{
        const url=new URL(value);
        const hosts=allowedHosts[sourceId]||[];
        return url.protocol==="https:" && !url.username && !url.password && !url.port && !url.hash
          && hosts.includes(url.hostname.toLowerCase().replace(/\.$/,"")) ? url.href : "";
      }catch(_){return "";}
    };
    const parsedDate=value=>{
      if(typeof value!=="string" || value.length>64) return null;
      const date=new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    };
    const recentTermsReview=(value,now)=>{
      if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
      const reviewed=Date.parse(value+"T00:00:00.000Z"),today=Date.parse(new Date(now).toISOString().slice(0,10)+"T00:00:00.000Z");
      return Number.isFinite(reviewed)&&new Date(reviewed).toISOString().slice(0,10)===value
        &&reviewed<=today&&today-reviewed<=365*86400000;
    };
    const formatDate=value=>{
      const date=parsedDate(value);
      return date ? new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeZone:"Europe/Budapest"}).format(date) : "";
    };
    fetch("/national-news.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok){
        if(response.status===404){target.replaceChildren();placeholder.hidden=false;status.textContent="Nincs friss, ellenőrzött hír";return;}
        throw new Error("National news data unavailable");
      }
      const data=await response.json();
      if(data?.schema!=="palocindex.national-news.v1" || data?.status!=="approved_for_public_release"
          || !Array.isArray(data.items) || data.items.length>20) throw new Error("National news data not approved");
      const sourceIds=Array.isArray(data.source_ids)?data.source_ids
        :(typeof data.source_id==="string"?[data.source_id]:[]);
      const now=Date.now();
      const fresh=data.items.filter(item=>{
        const published=parsedDate(item?.published_at);
        const checked=parsedDate(item?.checked_at);
        const termsCurrent=recentTermsReview(item?.terms_checked_on,now);
        const sourceId=typeof item?.source_id==="string"?item.source_id:data.source_id;
        return item?.published===false && typeof item.id==="string" && item.id.length<=64
          && sourceIds.includes(sourceId)
          && typeof item.publisher==="string" && item.publisher.trim() && item.publisher.length<=200
          && typeof item.title==="string" && item.title.trim() && item.title.length<=180
          && typeof item.summary==="string" && item.summary.length<=1000
          && typeof item.attribution==="string" && item.attribution.trim() && item.attribution.length<=250
          && safeNewsUrl(item.source_url,sourceId) && safeNewsUrl(item.terms_url,sourceId) && termsCurrent
          && published && checked && published.getTime()<=now+5*60*1000
          && now-published.getTime()<=7*86400000 && checked.getTime()<=now+5*60*1000
          && now-checked.getTime()<=86400000;
      }).slice(0,12);
      target.replaceChildren();
      for(const item of fresh){
        const article=document.createElement("article");article.className="national-news-item";
        const sourceId=typeof item.source_id==="string"?item.source_id:data.source_id;
        const visual=document.createElement("a");visual.className="national-news-visual";
        visual.href=safeNewsUrl(item.source_url,sourceId);visual.target="_blank";visual.rel="noopener noreferrer";
        visual.setAttribute("aria-label","A hír forrásának megnyitása: "+item.title);
        const illustration=document.createElement("img");
        const storyText=(item.title+" "+item.summary).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
        const illustrationPath=sourceId&&sourceId.startsWith("police-")?"/assets-v5/news-community.svg?v=20261119-art-detail1"
          :/(kereset|foglalkoztat|munkahely|(^|[^a-z])ber([^a-z]|$))/u.test(storyText)?"/assets-v5/jobs-opportunities.svg?v=20261119-art-detail1"
          :/(mezogazdas|agrar|allattenyeszt|novenytermeszt)/u.test(storyText)?"/assets-v5/farm.jpg"
          :/(epitoipar|epites|lakas)/u.test(storyText)?"/assets-v5/road-info.svg?v=20261119-detail2"
          :"/assets-v5/news-data.svg?v=20261119-art-detail1";
        illustration.src=illustrationPath;
        illustration.alt="";illustration.loading="lazy";visual.appendChild(illustration);article.appendChild(visual);
        const heading=document.createElement("h3");heading.textContent=item.title;article.appendChild(heading);
        const summaryText=item.summary.trim();
        const monthNames="(?:january|januar|jan\\.?|february|februar|feb\\.?|march|marcius|mar\\.?|april|aprilis|apr\\.?|may|majus|june|junius|jun\\.?|july|julius|jul\\.?|august|augusztus|aug\\.?|september|szeptember|sept?\\.?|october|oktober|oct\\.?|okt\\.?|november|nov\\.?|december|dec\\.?)";
        const summaryIsDateOnly=/^\d{4}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}\.?$/u.test(summaryText)
          || new RegExp(`^\\d{4}[.,]?\\s*${monthNames}\\s+\\d{1,2}\\.?$`,"iu").test(summaryText)
          || new RegExp(`^\\d{1,2}\\.?\\s*${monthNames},?\\s+\\d{4}\\.?$`,"iu").test(summaryText)
          || new RegExp(`^${monthNames}\\s+\\d{1,2},?\\s+\\d{4}\\.?$`,"iu").test(summaryText);
        if(/[\p{L}]{3,}/u.test(summaryText) && !summaryIsDateOnly){
          const summary=document.createElement("p");summary.textContent=summaryText;article.appendChild(summary);
        }
        const meta=document.createElement("div");meta.className="news-meta";
        const publisher=document.createElement("span");publisher.textContent=item.publisher;meta.appendChild(publisher);
        const published=document.createElement("span");published.textContent="Megjelent: "+formatDate(item.published_at);meta.appendChild(published);
        const checked=document.createElement("span");checked.textContent="Ellenőrizve: "+formatDate(item.checked_at);meta.appendChild(checked);
        const attribution=document.createElement("span");attribution.textContent=item.attribution;meta.appendChild(attribution);
        article.appendChild(meta);
        const source=document.createElement("a");source.href=safeNewsUrl(item.source_url,sourceId);source.target="_blank";source.rel="noopener noreferrer";source.textContent="Forrás megnyitása ↗";article.appendChild(source);
        const terms=document.createElement("a");terms.className="news-terms";terms.href=safeNewsUrl(item.terms_url,sourceId);terms.target="_blank";terms.rel="noopener noreferrer";terms.textContent="Felhasználási feltételek ↗";article.appendChild(terms);
        target.appendChild(article);
      }
      placeholder.hidden=fresh.length>0;
      if(fresh.length){
        const newest=fresh.map(item=>parsedDate(item.checked_at)).filter(Boolean).sort((a,b)=>b-a)[0];
        status.textContent="Frissítve: "+formatDate(newest.toISOString())+" · "+fresh.length+" hír";
      }else status.textContent="Nincs friss, ellenőrzött hír";
      if(fresh.length){
        const expiresAt=Math.min(...fresh.flatMap(item=>[
          parsedDate(item.checked_at).getTime()+86400000,
          parsedDate(item.published_at).getTime()+7*86400000,
        ]))+1;
        scheduleFreshnessExpiry(expiresAt,()=>{
          target.replaceChildren();placeholder.hidden=false;status.textContent="Az ellenőrzött hírek lejártak; friss adatot keresünk.";
          loadNationalNews();
        });
      }
    }).catch(()=>{target.replaceChildren();placeholder.hidden=false;status.textContent="A hírrovat frissítése jelenleg nem érhető el";});
  }
  function loadInternationalNews(){
    const status=el("international-news-status");
    const target=el("international-news-items");
    const placeholder=el("international-news-placeholder");
    if(!status || !target || !placeholder) return;
    const internationalSources={
      "eurostat-news-releases":{publisher:"Eurostat – Európai Bizottság",attribution:"Forrás: Eurostat – Európai Bizottság",termsUrl:"https://ec.europa.eu/eurostat/help/copyright-notice",hosts:["ec.europa.eu"]},
      "eu-research-innovation":{publisher:"Európai Bizottság – Kutatás és Innováció",attribution:"Forrás: Európai Bizottság – Kutatás és Innováció (CC BY 4.0)",termsUrl:"https://commission.europa.eu/legal-notice_en",hosts:["research-and-innovation.ec.europa.eu","commission.europa.eu"]},
    };
    const safeUrl=(value,hosts)=>{
      try{
        const url=new URL(value);
        return url.protocol==="https:" && !url.username && !url.password && !url.port && !url.hash
          && hosts.includes(url.hostname.toLowerCase().replace(/\.$/,"")) ? url.href : "";
      }catch(_){return "";}
    };
    const date=value=>{
      if(typeof value!=="string" || value.length>64) return null;
      const parsed=new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    };
    const format=value=>{
      const parsed=date(value);
      return parsed ? new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeZone:"Europe/Budapest"}).format(parsed) : "";
    };
    const recentTermsReview=value=>{
      if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
      const reviewed=Date.parse(value+"T00:00:00.000Z"),today=Date.parse(new Date(Date.now()).toISOString().slice(0,10)+"T00:00:00.000Z");
      return Number.isFinite(reviewed)&&new Date(reviewed).toISOString().slice(0,10)===value
        &&reviewed<=today&&today-reviewed<=365*86400000;
    };
    fetch("/international-news.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok){
        if(response.status===404){target.replaceChildren();placeholder.hidden=false;status.textContent="Friss, ellenőrzött nemzetközi hír jelenleg nincs";return;}
        throw new Error("International news data unavailable");
      }
      const data=await response.json();
      if(data?.schema!=="palocindex.international-news.v1" || data?.status!=="approved_for_public_release"
          || data?.published!==false || !Array.isArray(data.source_ids)
          || data.source_ids.length!==1 || !internationalSources[data.source_ids[0]]
          || !Array.isArray(data.items) || data.items.length>20) throw new Error("International news data not approved");
      const selectedSource=internationalSources[data.source_ids[0]];
      const now=Date.now();
      const fresh=data.items.filter(item=>{
        const published=date(item?.published_at), checked=date(item?.checked_at), reviewed=date(item?.reviewed_at);
        return item?.published===false && item?.facts_verified===true && item?.source_id===data.source_ids[0]
          && item?.publisher===selectedSource.publisher && item?.attribution===selectedSource.attribution
          && item?.terms_url===selectedSource.termsUrl
          && typeof item.id==="string" && item.id.length<=64
          && typeof item.publisher==="string" && item.publisher.trim() && item.publisher.length<=200
          && typeof item.title==="string" && item.title.trim() && item.title.length<=180
          && typeof item.summary==="string" && item.summary.trim() && item.summary.length<=1000
          && typeof item.attribution==="string" && item.attribution.trim() && item.attribution.length<=250
          && safeUrl(item.source_url,selectedSource.hosts) && safeUrl(item.terms_url,selectedSource.hosts) && published && checked && reviewed
          && recentTermsReview(item.terms_checked_on)
          && published.getTime()<=now+5*60*1000 && now-published.getTime()<=7*86400000
          && checked.getTime()<=now+5*60*1000 && now-checked.getTime()<=86400000
          && reviewed.getTime()<=now+5*60*1000 && now-reviewed.getTime()<=86400000;
      }).slice(0,12);
      target.replaceChildren();
      for(const item of fresh){
        const article=document.createElement("article");article.className="national-news-item";
        const visual=document.createElement("a");visual.className="national-news-visual";
        visual.href=safeUrl(item.source_url,selectedSource.hosts);visual.target="_blank";visual.rel="noopener noreferrer";
        visual.setAttribute("aria-label",item.publisher+"-forrás megnyitása: "+item.title);
        const illustration=document.createElement("img");illustration.src="/assets-v5/news-data.svg?v=20261119-art-detail1";
        illustration.alt="";illustration.loading="lazy";visual.appendChild(illustration);article.appendChild(visual);
        const heading=document.createElement("h3");heading.textContent=item.title;article.appendChild(heading);
        const summary=document.createElement("p");summary.textContent=item.summary;article.appendChild(summary);
        const editorialNote=document.createElement("small");editorialNote.className="news-editorial-note";
        editorialNote.textContent="Önálló, magyar nyelvű szerkesztői összefoglaló a megjelölt forrás alapján; a szövegért a PalócIndex felel.";
        article.appendChild(editorialNote);
        const meta=document.createElement("div");meta.className="news-meta";
        for(const value of [item.publisher,"Megjelent: "+format(item.published_at),"Ellenőrizve: "+format(item.checked_at),item.attribution]){
          const span=document.createElement("span");span.textContent=value;meta.appendChild(span);
        }
        article.appendChild(meta);
        const source=document.createElement("a");source.href=safeUrl(item.source_url,selectedSource.hosts);source.target="_blank";
        source.rel="noopener noreferrer";source.textContent=item.publisher+"-forrás megnyitása ↗";article.appendChild(source);
        const terms=document.createElement("a");terms.className="news-terms";terms.href=safeUrl(item.terms_url,selectedSource.hosts);
        terms.target="_blank";terms.rel="noopener noreferrer";terms.textContent="Felhasználási feltételek ↗";article.appendChild(terms);
        target.appendChild(article);
      }
      if(fresh.length){placeholder.hidden=true;status.textContent="Kézzel ellenőrzött · "+selectedSource.publisher;}
      else{placeholder.hidden=false;status.textContent="Friss, ellenőrzött nemzetközi hír jelenleg nincs";}
      if(fresh.length){
        const expiresAt=Math.min(...fresh.flatMap(item=>[
          date(item.checked_at).getTime()+86400000,
          date(item.reviewed_at).getTime()+86400000,
          date(item.published_at).getTime()+7*86400000,
        ]))+1;
        scheduleFreshnessExpiry(expiresAt,()=>{
          target.replaceChildren();placeholder.hidden=false;status.textContent="Az ellenőrzött nemzetközi hírek lejártak; friss adatot keresünk.";
          loadInternationalNews();
        });
      }
    }).catch(()=>{status.textContent="Friss nemzetközi hír jelenleg nem érhető el";});
  }
  function loadRegionalWeather(){
    const status=el("weather-regional-status");
    const text=el("weather-regional-text");
    const meta=el("weather-regional-meta");
    const placeholder=el("weather-regional-placeholder");
    const badge=el("weather-regional-badge");
    if(!status||!text||!meta||!placeholder||!badge)return;
    const safeSource=value=>{
      try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port
        &&u.hostname==="odp.met.hu"&&u.pathname.startsWith("/weather/text_forecast/regional_forecast/flRs/txt/flRs")
        &&u.pathname.endsWith(".txt.zip")&&!u.search&&!u.hash?u.href:"";}catch(_){return "";}
    };
    const safeTerms=value=>{
      try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port
        &&u.hostname==="odp.met.hu"&&u.pathname==="/ODP_altalanos_felhasznalasi_feltetelek.pdf"&&!u.search&&!u.hash?u.href:"";}catch(_){return "";}
    };
    const date=value=>typeof value==="string"&&value.length<=64&&Number.isFinite(Date.parse(value))?new Date(value):null;
    const format=value=>new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Budapest"}).format(value);
    fetch("/weather-regional.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Weather candidate unavailable");
      const data=await response.json();
      const issued=date(data?.issued_at),checked=date(data?.checked_at),now=Date.now();
      if(data?.schema!=="palocindex.weather.v1"||data?.status!=="approved_for_public_release"||data?.published!==false
        ||data?.scope!=="Nógrád vármegye, nem településspecifikus"
        ||typeof data.forecast_text!=="string"||!data.forecast_text.trim()||data.forecast_text.length>32000
        ||data.forecast_text.includes("\0")||data?.attribution!=="Adatbázis: Meteorológiai Adattár, HungaroMet Nonprofit Zrt."
        ||!safeSource(data.source_url)||!safeTerms(data.terms_url)||!issued||!checked
        ||issued.getTime()>now+5*60*1000||now-issued.getTime()>36*3600000
        ||checked.getTime()>now+5*60*1000||now-checked.getTime()>24*3600000)throw new Error("Weather candidate failed validation");
      text.textContent=data.forecast_text;
      text.hidden=false;
      meta.replaceChildren();
      const issue=document.createElement("span");issue.textContent="Kiadva: "+format(issued);meta.appendChild(issue);
      const attribution=document.createElement("span");attribution.textContent=data.attribution;meta.appendChild(attribution);
      const source=document.createElement("a");source.href=safeSource(data.source_url);source.target="_blank";source.rel="noopener noreferrer";source.textContent="HungaroMet forrás ↗";meta.appendChild(source);
      const terms=document.createElement("a");terms.href=safeTerms(data.terms_url);terms.target="_blank";terms.rel="noopener noreferrer";terms.textContent="Felhasználási feltételek ↗";meta.appendChild(terms);
      placeholder.hidden=true;meta.hidden=false;badge.textContent="Friss";status.textContent="Ellenőrizve: "+format(checked);
      scheduleFreshnessExpiry(Math.min(issued.getTime()+36*3600000,checked.getTime()+24*3600000)+1,()=>{
        text.textContent="";text.hidden=true;meta.replaceChildren();meta.hidden=true;placeholder.hidden=false;
        badge.textContent="Nincs friss adat";status.textContent="Az előrejelzés lejárt; friss, ellenőrzött adatot keresünk.";
        loadRegionalWeather();
      });
    }).catch(()=>{text.textContent="";text.hidden=true;meta.replaceChildren();meta.hidden=true;placeholder.hidden=false;badge.textContent="Nincs friss adat";status.textContent="Nincs elérhető, kellően friss regionális előrejelzés";});
  }
  function loadDailyWeather(){
    const status=el("weather-daily-status"),target=el("weather-daily-cards"),placeholder=el("weather-daily-placeholder");
    const badge=el("weather-daily-badge"),meta=el("weather-daily-meta"),heading=el("weather-daily-heading");
    if(!status||!target||!placeholder||!badge||!meta||!heading)return;
    const sourceUrl="https://odp.met.hu/weather/nwp/FOCUS/nc/";
    const metadataUrl="https://odp.met.hu/weather/nwp/FOCUS/focus.json";
    const termsUrl="https://odp.met.hu/ODP_altalanos_felhasznalasi_feltetelek.pdf";
    const attribution="Adatbázis: Meteorológiai Adattár, HungaroMet Nonprofit Zrt.";
    const scope="Nógrád vármegye; 48,1°É, 19,8°K FOCUS-rácspont (regionális, nem településenkénti előrejelzés)";
    const weatherTypes={1:"derült",2:"kissé felhős",3:"közepesen felhős",4:"erősen felhős",5:"borult",6:"fátyolfelhős",7:"ködös",9:"derült, párás",10:"közepesen felhős, párás",11:"borult, párás",12:"erősen fátyolfelhős",101:"szitálás",102:"eső",103:"zápor",104:"zivatar esővel",105:"ónos szitálás",106:"ónos eső",107:"hószállingózás",108:"havazás",109:"hózápor",110:"havas eső",112:"hózivatar",202:"kiadós eső",203:"erős zápor",208:"erős havazás",209:"erős hózápor",304:"zivatar záporral",310:"havas eső záporral",500:"hófúvás"};
    const exact=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)
      &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
    const parseTime=value=>typeof value==="string"&&value.length<=64&&Number.isFinite(Date.parse(value))?new Date(value):null;
    const iconFor=code=>({
      1:["☀️","sunny"],2:["🌤️","partly-cloudy"],3:["⛅","partly-cloudy"],4:["☁️","cloudy"],5:["☁️","cloudy"],
      6:["🌥️","partly-cloudy"],7:["🌫️","fog"],9:["🌤️","sunny"],10:["⛅","partly-cloudy"],11:["☁️","cloudy"],12:["🌥️","partly-cloudy"],
      101:["🌦️","drizzle"],102:["🌧️","rain"],103:["🌦️","rain"],104:["⛈️","thunderstorm"],105:["🌧️","freezing"],106:["🌧️","freezing"],
      107:["🌨️","snow"],108:["❄️","snow"],109:["🌨️","snow"],110:["🌨️","sleet"],112:["⛈️","thunderstorm"],
      202:["🌧️","rain"],203:["🌧️","rain"],208:["❄️","snow"],209:["🌨️","snow"],304:["⛈️","thunderstorm"],310:["🌨️","sleet"],500:["🌨️","snow"],
    }[code]||["🌧️","rain"]);
    const temp=value=>new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(value)+"°";
    const dateFormat=new Intl.DateTimeFormat("hu-HU",{weekday:"short",month:"short",day:"numeric",timeZone:"Europe/Budapest"});
    fetch("/weather-daily.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Daily forecast unavailable");
      const data=await response.json(),now=Date.now(),issued=parseTime(data?.issued_at),checked=parseTime(data?.checked_at);
      const rootKeys=["schema","status","published","scope","issued_at","checked_at","source_url","metadata_url","terms_url","attribution","days"];
      if(!exact(data,rootKeys)||data.schema!=="palocindex.weather-daily.v1"||data.status!=="approved_for_public_release"||data.published!==false
        ||data.scope!==scope||data.source_url!==sourceUrl||data.metadata_url!==metadataUrl||data.terms_url!==termsUrl||data.attribution!==attribution
        ||!issued||!checked||issued.getTime()>now+5*60000||now-issued.getTime()>36*3600000
        ||checked.getTime()>now+5*60000||now-checked.getTime()>24*3600000||!Array.isArray(data.days)||data.days.length<6||data.days.length>7)
        throw new Error("Daily forecast failed provenance or freshness checks");
      const seen=new Set(),days=data.days;
      const localDay=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
      const issueDay=localDay(issued),currentDay=localDay(new Date(now));
      const firstDay=issueDay>currentDay?issueDay:currentDay;
      const lastAllowedDay=new Date(Date.parse(issueDay+"T00:00:00Z")+6*86400000).toISOString().slice(0,10);
      if(days[0]?.date!==firstDay||days[days.length-1]?.date>lastAllowedDay)throw new Error("Daily forecast dates do not match the current FOCUS cycle");
      days.forEach((day,index)=>{
        if(!exact(day,["date","tmin_c","tmax_c","weather_code","weather","weather_lead_hours"])
          ||typeof day.date!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day.date)
          ||!Number.isFinite(Date.parse(day.date+"T12:00:00Z"))||day.date>new Date(now+8*86400000).toISOString().slice(0,10)
          ||seen.has(day.date)||(index>0&&Date.parse(day.date+"T00:00:00Z")-Date.parse(days[index-1].date+"T00:00:00Z")!==86400000)
          ||typeof day.tmin_c!=="number"||!Number.isFinite(day.tmin_c)||typeof day.tmax_c!=="number"||!Number.isFinite(day.tmax_c)
          ||day.tmin_c < -60||day.tmax_c>60||day.tmin_c>day.tmax_c||!Object.hasOwn(weatherTypes,day.weather_code)
          ||day.weather!==weatherTypes[day.weather_code]||!Number.isInteger(day.weather_lead_hours)||day.weather_lead_hours<0||day.weather_lead_hours>168)
          throw new Error("Daily forecast day failed validation");
        seen.add(day.date);
      });
      target.replaceChildren();heading.textContent=days.length+" napos előrejelzés";
      days.forEach((day,index)=>{
        const isToday=day.date===currentDay;
        const card=document.createElement("article");card.className="weather-day-card"+(isToday?" weather-day-card--today":"");
        const heading=document.createElement("h4");heading.textContent=(isToday?"Ma · ":"")+dateFormat.format(new Date(day.date+"T12:00:00Z"));
        if(isToday)heading.setAttribute("aria-current","date");
        card.appendChild(heading);
        const [symbol,mood]=iconFor(day.weather_code);
        const icon=document.createElement("span");icon.className=`weather-day-icon weather-${mood}`;icon.setAttribute("aria-hidden","true");icon.textContent=symbol;card.appendChild(icon);
        const condition=document.createElement("p");condition.className="weather-day-condition";condition.textContent=day.weather;card.appendChild(condition);
        const range=document.createElement("p");range.className="weather-day-range";
        const low=document.createElement("span");low.textContent="Min. "+temp(day.tmin_c);range.appendChild(low);
        const high=document.createElement("strong");high.textContent="Max. "+temp(day.tmax_c);range.appendChild(high);card.appendChild(range);
        target.appendChild(card);
      });
      if(days.length===6){
        const nextDate=new Date(days[days.length-1].date+"T12:00:00Z");nextDate.setUTCDate(nextDate.getUTCDate()+1);
        const card=document.createElement("article");card.className="weather-day-card weather-day-card--unavailable";
        const dayHeading=document.createElement("h4");dayHeading.textContent=dateFormat.format(nextDate);card.appendChild(dayHeading);
        const icon=document.createElement("span");icon.className="weather-day-icon weather-day-icon--unavailable";icon.setAttribute("aria-hidden","true");icon.textContent="—";card.appendChild(icon);
        const note=document.createElement("p");note.className="weather-day-unavailable";note.textContent="Még nincs előrejelzés";card.appendChild(note);
        target.appendChild(card);
      }
      const format=value=>new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Budapest"}).format(value);
      meta.replaceChildren();
      const info=document.createElement("span");info.textContent="Kiadás: "+format(issued)+" · Ellenőrizve: "+format(checked);meta.appendChild(info);
      [[sourceUrl,"HungaroMet FOCUS forrás"],[metadataUrl,"Adatleírás"],[termsUrl,"Felhasználási feltételek"]].forEach(([url,label])=>{
        const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label+" ↗";meta.appendChild(link);
      });
      const credit=document.createElement("span");credit.textContent=attribution;meta.appendChild(credit);
      meta.hidden=false;placeholder.hidden=true;badge.textContent="Friss · "+days.length+" nap";status.textContent="Előrejelzési modell: 48,1°É, 19,8°K rácspont; a napi szélsőértékek a modellpontokból számítva.";
      scheduleFreshnessExpiry(Math.min(issued.getTime()+36*3600000,checked.getTime()+24*3600000)+1,()=>{
        target.replaceChildren();meta.replaceChildren();meta.hidden=true;placeholder.textContent="Jelenleg nincs friss, ellenőrzött napi előrejelzés.";placeholder.hidden=false;
        badge.textContent="Nincs friss adat";status.textContent="Az előrejelzés lejárt; friss, ellenőrzött adatot keresünk.";
        loadDailyWeather();
      });
    }).catch(()=>{
      target.replaceChildren();meta.replaceChildren();meta.hidden=true;placeholder.textContent="Jelenleg nincs friss, ellenőrzött napi előrejelzés.";placeholder.hidden=false;badge.textContent="Nincs friss adat";
      status.textContent="Nincs elérhető, kellően friss, ellenőrzött napi előrejelzés";
    });
  }
  function loadWeatherECMWF(){
    const panel=el("weather-ecmwf-panel"),target=el("weather-ecmwf-cards"),status=el("weather-ecmwf-status");
    const badge=el("weather-ecmwf-badge"),meta=el("weather-ecmwf-meta"),focus=el("weather-daily-panel"),metno=el("weather-metno-panel");
    if(!panel||!target||!status||!badge||!meta||!focus)return;
    const sourceUrl="https://data.ecmwf.int/forecasts/",termsUrl="https://apps.ecmwf.int/datasets/licences/general/";
    const licenseUrl="https://creativecommons.org/licenses/by/4.0/";
    const scope="Nógrád vármegye; 48.0°É, 19.75°K reprezentatív ECMWF IFS rácspont (nem településspecifikus)";
    const attribution="This service is based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF).";
    const exact=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)
      &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
    const parseTime=value=>typeof value==="string"&&value.length<=64&&Number.isFinite(Date.parse(value))?new Date(value):null;
    const localDay=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
    const format=value=>new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Budapest"}).format(value);
    const dayFormat=new Intl.DateTimeFormat("hu-HU",{weekday:"short",month:"short",day:"numeric",timeZone:"Europe/Budapest"});
    const focusSourceUrl="https://odp.met.hu/weather/nwp/FOCUS/nc/",focusMetadataUrl="https://odp.met.hu/weather/nwp/FOCUS/focus.json";
    const focusTermsUrl="https://odp.met.hu/ODP_altalanos_felhasznalasi_feltetelek.pdf";
    const focusAttribution="Adatbázis: Meteorológiai Adattár, HungaroMet Nonprofit Zrt.";
    const focusScope="Nógrád vármegye; 48,1°É, 19,8°K FOCUS-rácspont (regionális, nem településenkénti előrejelzés)";
    const weatherTypes={1:"derült",2:"kissé felhős",3:"közepesen felhős",4:"erősen felhős",5:"borult",6:"fátyolfelhős",7:"ködös",9:"derült, párás",10:"közepesen felhős, párás",11:"borult, párás",12:"erősen fátyolfelhős",101:"szitálás",102:"eső",103:"zápor",104:"zivatar esővel",105:"ónos szitálás",106:"ónos eső",107:"hószállingózás",108:"havazás",109:"hózápor",110:"havas eső",112:"hózivatar",202:"kiadós eső",203:"erős zápor",208:"erős havazás",209:"erős hózápor",304:"zivatar záporral",310:"havas eső záporral",500:"hófúvás"};
    const weatherIcons={1:["☀️","sunny"],2:["🌤️","partly-cloudy"],3:["⛅","partly-cloudy"],4:["☁️","cloudy"],5:["☁️","cloudy"],6:["🌥️","partly-cloudy"],7:["🌫️","fog"],9:["🌤️","sunny"],10:["⛅","partly-cloudy"],11:["☁️","cloudy"],12:["🌥️","partly-cloudy"],101:["🌦️","drizzle"],102:["🌧️","rain"],103:["🌦️","rain"],104:["⛈️","thunderstorm"],105:["🌧️","freezing"],106:["🌧️","freezing"],107:["🌨️","snow"],108:["❄️","snow"],109:["🌨️","snow"],110:["🌨️","sleet"],112:["⛈️","thunderstorm"],202:["🌧️","rain"],203:["🌧️","rain"],208:["❄️","snow"],209:["🌨️","snow"],304:["⛈️","thunderstorm"],310:["🌨️","sleet"],500:["🌨️","snow"]};
    fetch("/weather-daily-ecmwf.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("ECMWF forecast unavailable");
      const data=await response.json(),now=Date.now(),issued=parseTime(data?.issued_at),checked=parseTime(data?.checked_at);
      const keys=["schema","status","published","scope","issued_at","checked_at","source_url","terms_url","license_url","attribution","sampling","days"];
      if(!exact(data,keys)||data.schema!=="palocindex.weather-daily-ecmwf.v1"||data.status!=="approved_for_public_release"||data.published!==false
        ||data.scope!==scope||data.source_url!==sourceUrl||data.terms_url!==termsUrl||data.license_url!==licenseUrl
        ||data.attribution!==attribution||data.sampling!=="6-hourly instantaneous 2m temperature; extrema are sampled, not complete daily extremes"
        ||!issued||!checked||issued.getTime()>now+5*60000||now-issued.getTime()>36*3600000
        ||checked.getTime()>now+5*60000||now-checked.getTime()>6*3600000||!Array.isArray(data.days)||data.days.length!==9)
        throw new Error("ECMWF forecast failed source or freshness checks");
      const firstDay=localDay(new Date(now));
      data.days.forEach((day,index)=>{
        const expectedDate=new Date(Date.parse(firstDay+"T00:00:00Z")+index*86400000).toISOString().slice(0,10);
        if(!exact(day,["date","tmin_sample_c","tmax_sample_c","sample_count"])||day.date!==expectedDate
          ||!Number.isFinite(Date.parse(day.date+"T12:00:00Z"))||!Number.isFinite(day.tmin_sample_c)||!Number.isFinite(day.tmax_sample_c)
          ||day.tmin_sample_c < -60||day.tmax_sample_c>60||day.tmin_sample_c>day.tmax_sample_c||day.sample_count!==4)
          throw new Error("ECMWF daily sample failed validation");
      });
      const conditionsByDate=new Map();
      try{
        const focusResponse=await fetch("/weather-daily.json",{cache:"no-store"});
        if(focusResponse.ok){
          const focusData=await focusResponse.json(),focusIssued=parseTime(focusData?.issued_at),focusChecked=parseTime(focusData?.checked_at);
          const focusKeys=["schema","status","published","scope","issued_at","checked_at","source_url","metadata_url","terms_url","attribution","days"];
          const validFocus=exact(focusData,focusKeys)&&focusData.schema==="palocindex.weather-daily.v1"
            &&focusData.status==="approved_for_public_release"&&focusData.published===false&&focusData.scope===focusScope
            &&focusData.source_url===focusSourceUrl&&focusData.metadata_url===focusMetadataUrl&&focusData.terms_url===focusTermsUrl
            &&focusData.attribution===focusAttribution&&focusIssued&&focusChecked&&focusIssued.getTime()<=now+5*60000
            &&now-focusIssued.getTime()<=36*3600000&&focusChecked.getTime()<=now+5*60000&&now-focusChecked.getTime()<=24*3600000
            &&Array.isArray(focusData.days)&&focusData.days.length>=6&&focusData.days.length<=7;
          if(validFocus){
            const issueDay=localDay(focusIssued),currentDay=localDay(new Date(now)),firstFocusDay=issueDay>currentDay?issueDay:currentDay;
            const lastFocusDay=new Date(Date.parse(issueDay+"T00:00:00Z")+6*86400000).toISOString().slice(0,10);
            if(focusData.days[0]?.date!==firstFocusDay||focusData.days.at(-1)?.date>lastFocusDay)throw new Error("FOCUS day sequence failed validation");
            focusData.days.forEach((focusDay,index)=>{
              const expectedDate=new Date(Date.parse(firstFocusDay+"T00:00:00Z")+index*86400000).toISOString().slice(0,10);
              if(!exact(focusDay,["date","tmin_c","tmax_c","weather_code","weather","weather_lead_hours"])
                ||focusDay.date!==expectedDate||typeof focusDay.tmin_c!=="number"||!Number.isFinite(focusDay.tmin_c)
                ||typeof focusDay.tmax_c!=="number"||!Number.isFinite(focusDay.tmax_c)||focusDay.tmin_c < -60||focusDay.tmax_c>60
                ||focusDay.tmin_c>focusDay.tmax_c||!Object.hasOwn(weatherTypes,focusDay.weather_code)
                ||focusDay.weather!==weatherTypes[focusDay.weather_code]||!Number.isInteger(focusDay.weather_lead_hours)
                ||focusDay.weather_lead_hours<0||focusDay.weather_lead_hours>168)throw new Error("FOCUS condition failed validation");
              conditionsByDate.set(focusDay.date,{description:focusDay.weather,visual:weatherIcons[focusDay.weather_code]});
            });
          }
        }
      }catch{conditionsByDate.clear();}
      target.replaceChildren();
      data.days.forEach(day=>{
        const isToday=day.date===firstDay,card=document.createElement("article");
        card.className="weather-day-card weather-day-card--ecmwf"+(isToday?" weather-day-card--today":"");
        const heading=document.createElement("h4");heading.textContent=(isToday?"Ma · ":"")+dayFormat.format(new Date(day.date+"T12:00:00Z"));
        if(isToday)heading.setAttribute("aria-current","date");card.appendChild(heading);
        const condition=conditionsByDate.get(day.date);
        const icon=document.createElement("span");icon.className="weather-day-icon"+(condition?" weather-"+condition.visual[1]:"");icon.setAttribute("aria-hidden","true");icon.textContent=condition?condition.visual[0]:"🌡️";card.appendChild(icon);
        const note=document.createElement("p");note.className="weather-day-condition";note.textContent=condition?condition.description:day.sample_count+" hőmérséklet-mintából";card.appendChild(note);
        const range=document.createElement("p");range.className="weather-day-range";
        const low=document.createElement("span");low.textContent="Min. "+new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(day.tmin_sample_c)+"°";range.appendChild(low);
        const high=document.createElement("strong");high.textContent="Max. "+new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(day.tmax_sample_c)+"°";range.appendChild(high);card.appendChild(range);target.appendChild(card);
      });
      meta.replaceChildren();
      const timing=document.createElement("span");timing.textContent="Kiadás: "+format(issued)+" · Ellenőrizve: "+format(checked);meta.appendChild(timing);
      [[sourceUrl,"ECMWF adatforrás"],[termsUrl,"ECMWF adatfelhasználási feltételek"],[licenseUrl,"CC BY 4.0 licenc"]].forEach(([url,label])=>{
        const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label+" ↗";meta.appendChild(link);
      });
      if(conditionsByDate.size){
        [[focusSourceUrl,"HungaroMet FOCUS időjárási feltétel"],[focusMetadataUrl,"FOCUS adatleírás"],[focusTermsUrl,"HungaroMet felhasználási feltételek"]].forEach(([url,label])=>{
          const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label+" ↗";meta.appendChild(link);
        });
        const focusCredit=document.createElement("span");focusCredit.textContent=focusAttribution;meta.appendChild(focusCredit);
      }
      const credit=document.createElement("span");credit.textContent=attribution;meta.appendChild(credit);meta.hidden=false;
      panel.hidden=false;focus.hidden=true;if(metno)metno.hidden=true;badge.textContent="Friss · 9 nap";
      status.textContent="ECMWF IFS · 48.0°É, 19.75°K regionális rácspont · napi értékek négy hatórás mintából.";
      scheduleFreshnessExpiry(Math.min(issued.getTime()+36*3600000,checked.getTime()+6*3600000)+1,()=>{
        target.replaceChildren();meta.replaceChildren();meta.hidden=true;panel.hidden=true;focus.hidden=false;
        status.textContent="A kilencnapos ECMWF-előrejelzés lejárt; friss adatot keresünk.";loadWeatherECMWF();loadDailyWeather();
      });
    }).catch(()=>{target.replaceChildren();meta.replaceChildren();meta.hidden=true;panel.hidden=true;focus.hidden=false;});
  }
  function loadWeatherMetNo(){
    const panel=el("weather-metno-panel"),target=el("weather-metno-cards"),status=el("weather-metno-status");
    const badge=el("weather-metno-badge"),meta=el("weather-metno-meta"),focus=el("weather-daily-panel");
    if(!panel||!target||!status||!badge||!meta||!focus)return;
    const sourceUrl="https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=48.1&lon=19.8";
    const termsUrl="https://docs.api.met.no/doc/TermsOfService";
    const licenseUrl="https://creativecommons.org/licenses/by/4.0/";
    const scope="Nógrád vármegye; 48,1000°É, 19,8000°K reprezentatív globális modellpont (nem településspecifikus)";
    const attribution="Időjárási adatok: MET Norway Locationforecast; napi szélsőértékek a rendelkezésre álló előrejelzési időpontokból számítva.";
    const exact=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)
      &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
    const parseTime=value=>typeof value==="string"&&value.length<=64&&Number.isFinite(Date.parse(value))?new Date(value):null;
    const format=value=>new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Budapest"}).format(value);
    const dayFormat=new Intl.DateTimeFormat("hu-HU",{weekday:"short",month:"short",day:"numeric",timeZone:"Europe/Budapest"});
    const localDay=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
    const weatherVisual=symbol=>{
      const base=symbol.split("_",1)[0];
      if(base.includes("thunder"))return ["⛈️","thunderstorm"];
      if(base.includes("snow"))return ["🌨️","snow"];
      if(base.includes("sleet"))return ["🌨️","sleet"];
      if(base.includes("rain"))return ["🌧️","rain"];
      if(base==="fog")return ["🌫️","fog"];
      if(base==="cloudy")return ["☁️","cloudy"];
      if(base==="partlycloudy")return ["⛅","partly-cloudy"];
      if(base==="fair")return ["🌤️","partly-cloudy"];
      if(base==="clearsky")return ["☀️","sunny"];
      return null;
    };
    fetch("/weather-daily-metno.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Nine-day forecast unavailable");
      const data=await response.json(),now=Date.now();
      const issued=parseTime(data?.issued_at),checked=parseTime(data?.checked_at),accepted=parseTime(data?.terms_accepted_at);
      const rootKeys=["schema","status","published","scope","issued_at","checked_at","source_url","terms_url","license_url","terms_status","terms_revision","terms_accepted_at","attribution","days"];
      if(!exact(data,rootKeys)||data.schema!=="palocindex.weather-daily-metno.v1"||data.status!=="approved_for_public_release"||data.published!==false
        ||data.scope!==scope||data.source_url!==sourceUrl||data.terms_url!==termsUrl||data.license_url!==licenseUrl
        ||data.terms_status!=="owner_accepted"||data.terms_revision!=="2026-11-05"||data.attribution!==attribution
        ||!issued||!checked||!accepted||accepted.getTime()>now+5*60000||issued.getTime()>now+5*60000
        ||now-issued.getTime()>24*3600000||checked.getTime()>now+5*60000||now-checked.getTime()>6*3600000
        ||!Array.isArray(data.days)||data.days.length!==9)throw new Error("Nine-day forecast failed approval, source or freshness checks");
      const firstDay=localDay(new Date(now));
      data.days.forEach((day,index)=>{
        const expectedDate=new Date(Date.parse(firstDay+"T00:00:00Z")+index*86400000).toISOString().slice(0,10);
        if(!exact(day,["date","tmin_c","tmax_c","range_method","weather","symbol_code"])
          ||day.date!==expectedDate||!Number.isFinite(Date.parse(day.date+"T12:00:00Z"))
          ||typeof day.tmin_c!=="number"||!Number.isFinite(day.tmin_c)||day.tmin_c < -60||day.tmin_c>60
          ||typeof day.tmax_c!=="number"||!Number.isFinite(day.tmax_c)||day.tmax_c < -60||day.tmax_c>60||day.tmin_c>day.tmax_c
          ||day.range_method!=="sampled_forecast_timesteps"||typeof day.weather!=="string"||!day.weather.trim()||day.weather.length>80
          ||typeof day.symbol_code!=="string"||!/^[a-z0-9_]{1,64}$/.test(day.symbol_code)||!weatherVisual(day.symbol_code))
          throw new Error("Nine-day forecast day failed validation");
      });
      target.replaceChildren();
      data.days.forEach(day=>{
        const isToday=day.date===firstDay;
        const card=document.createElement("article");card.className="weather-day-card"+(isToday?" weather-day-card--today":"");
        const heading=document.createElement("h4");heading.textContent=(isToday?"Ma · ":"")+dayFormat.format(new Date(day.date+"T12:00:00Z"));
        if(isToday)heading.setAttribute("aria-current","date");
        card.appendChild(heading);
        const [symbol,mood]=weatherVisual(day.symbol_code);
        const icon=document.createElement("span");icon.className=`weather-day-icon weather-${mood}`;icon.setAttribute("aria-hidden","true");icon.textContent=symbol;card.appendChild(icon);
        const condition=document.createElement("p");condition.className="weather-day-condition";condition.textContent=day.weather;card.appendChild(condition);
        const range=document.createElement("p");range.className="weather-day-range";
        const low=document.createElement("span");low.textContent="Min. "+new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(day.tmin_c)+"°";range.appendChild(low);
        const high=document.createElement("strong");high.textContent="Max. "+new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(day.tmax_c)+"°";range.appendChild(high);card.appendChild(range);
        target.appendChild(card);
      });
      meta.replaceChildren();
      const timing=document.createElement("span");timing.textContent="Kiadás: "+format(issued)+" · Ellenőrizve: "+format(checked);meta.appendChild(timing);
      [[sourceUrl,"MET Norway adatforrás"],[termsUrl,"Szolgáltatási feltételek"],[licenseUrl,"CC BY 4.0 licenc"]].forEach(([url,label])=>{
        const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label;meta.appendChild(link);
      });
      const credit=document.createElement("span");credit.textContent=attribution;meta.appendChild(credit);
      meta.hidden=false;focus.hidden=true;panel.hidden=false;badge.textContent="Friss · 9 nap";
      status.textContent="MET Norway modellpont · a napi szélsőértékek a rendelkezésre álló előrejelzési időpontokból számítva.";
      scheduleFreshnessExpiry(Math.min(issued.getTime()+24*3600000,checked.getTime()+6*3600000)+1,()=>{
        target.replaceChildren();meta.replaceChildren();meta.hidden=true;panel.hidden=true;focus.hidden=false;
        status.textContent="A kilencnapos előrejelzés lejárt; friss adatot keresünk.";
        loadWeatherMetNo();loadDailyWeather();
      });
    }).catch(()=>{
      target.replaceChildren();meta.replaceChildren();meta.hidden=true;panel.hidden=true;focus.hidden=false;
    });
  }

  function loadWeatherObservations(){
    const status=el("weather-observations-status");
    const target=el("weather-observations-stations");
    const placeholder=el("weather-observations-placeholder");
    const sources=el("weather-observations-sources");
    const badge=el("weather-observations-badge");
    if(!status||!target||!placeholder||!sources||!badge)return;
    const stationNames={42318:"Mihálygerge",42604:"Balassagyarmat",42708:"Szécsény",43129:"Bánk",43227:"Mohora",43431:"Pásztó Hasznos",52523:"Zabar"};
    const measurements={
      r:["Órás csapadékösszeg","mm"],t:["Órás pillanatnyi hőmérséklet","°C"],ta:["léghőmérséklet","°C"],
      tn:["minimum-hőmérséklet","°C"],tx:["maximum-hőmérséklet","°C"],v:["látástávolság","m"],
      p:["légnyomás","hPa"],u:["relatív páratartalom","%"],sg:["Órás átlagos gammadozis","nSv/h"],
      sr:["Globálsugárzás órás összege","J/cm²"],suv:["UV-sugárzás órás összege","MED"],
      fs:["Szinoptikus szélsebesség","m/s"],fsd:["Szinoptikus szélirány","°"],
      fx:["Órás maximális széllökés sebessége","m/s"],fxd:["Órás maximális széllökés iránya","°"],
      we:["Pillanatnyi időképkód","kód"],p0:["tengerszinti légnyomás","hPa"],f:["szélsebesség","m/s"],
      fd:["szélirány","fok"],et5:["talajhőmérséklet 5 cm","°C"],et10:["talajhőmérséklet 10 cm","°C"],
      et20:["talajhőmérséklet 20 cm","°C"],et50:["talajhőmérséklet 50 cm","°C"],
      et100:["talajhőmérséklet 100 cm","°C"],tsn:["Felszínközeli hőmérséklet órás minimuma","°C"],
      tviz:["Vízhőmérséklet","°C"]
    };
    const termsUrl="https://odp.met.hu/ODP_altalanos_felhasznalasi_feltetelek.pdf";
    const sourceUrl="https://odp.met.hu/climate/observations_hungary/hourly/now/";
    const metadataUrl="https://odp.met.hu/climate/observations_hungary/hourly/station_meta_auto.csv";
    const attribution="Adatbázis: Meteorológiai Adattár, HungaroMet Nonprofit Zrt.";
    const exactKeys=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)
      &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
    const safeOfficialUrl=(value,expected)=>{
      try{const u=new URL(value);return u.href===expected&&u.protocol==="https:"&&u.hostname==="odp.met.hu"&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash?u.href:"";}catch(_){return "";}
    };
    const parseObservationTime=value=>{
      if(typeof value!=="string"||!/^\d{12}$/.test(value))return null;
      const iso=value.slice(0,4)+"-"+value.slice(4,6)+"-"+value.slice(6,8)+"T"+value.slice(8,10)+":"+value.slice(10,12)+":00Z";
      const parsed=new Date(iso);
      return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,16).replace(/[-T:]/g,"")===value?parsed:null;
    };
    const format=value=>new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Budapest"}).format(value);
    let staleObservation=null;
    fetch("/weather-observations.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("Weather observations unavailable");
      const data=await response.json();
      const now=Date.now(),checked=typeof data?.checked_at==="string"&&data.checked_at.length<=64?new Date(data.checked_at):null;
      const stationRows=data?.stations,withheld=data?.withheld_station_numbers;
      if(!exactKeys(data,["schema","status","published","scope","checked_at","source_url","metadata_url","terms_url","attribution","stations","withheld_station_numbers"])
        ||data.schema!=="palocindex.weather-observations.v1"||data.status!=="approved_for_public_release"||data.published!==false
        ||data.scope!=="Nógrád vármegyei állomásmérések; nem előrejelzés"||!safeOfficialUrl(data.source_url,sourceUrl)
        ||!safeOfficialUrl(data.metadata_url,metadataUrl)||!safeOfficialUrl(data.terms_url,termsUrl)||data.attribution!==attribution
        ||!checked||!Number.isFinite(checked.getTime())||checked.getTime()>now+5*60000||now-checked.getTime()>24*3600000
        ||!Array.isArray(stationRows)||stationRows.length<1||stationRows.length>Object.keys(stationNames).length
        ||!Array.isArray(withheld)||withheld.length>Object.keys(stationNames).length)throw new Error("Weather observations failed validation");
      const seenStations=new Set();
      const observedTimes=[];
      stationRows.forEach(station=>{
        const observed=parseObservationTime(station?.observed_at);
        if(!exactKeys(station,["station_number","name","observed_at","measurements"])
          ||!Number.isInteger(station.station_number)||station.name!==stationNames[station.station_number]
          ||seenStations.has(station.station_number)||!observed||observed.getTime()>now+5*60000
          ||!Array.isArray(station.measurements)||station.measurements.length>Object.keys(measurements).length)
          throw new Error("Station observation failed validation");
        seenStations.add(station.station_number);
        observedTimes.push(observed);
        const codes=new Set();
        station.measurements.forEach(item=>{
          if(!exactKeys(item,["code","label","unit","raw_value"])||typeof item.code!=="string"||!Object.hasOwn(measurements,item.code)
            ||codes.has(item.code)||item.label!==measurements[item.code][0]||item.unit!==measurements[item.code][1]
            ||typeof item.raw_value!=="string"||item.raw_value.length>64||item.raw_value.trim()==="-999"
            ||! /^[ \t]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)[ \t]*$/.test(item.raw_value))
            throw new Error("Station measurement failed validation");
          codes.add(item.code);
        });
      });
      if(!stationRows.some(station=>station.measurements.length>0))throw new Error("No supported station measurements");
      const withheldIds=new Set();
      withheld.forEach(id=>{
        if(!Number.isInteger(id)||!Object.hasOwn(stationNames,id)||withheldIds.has(id)||seenStations.has(id))
          throw new Error("Withheld station list failed validation");
        withheldIds.add(id);
      });
      if(seenStations.size+withheldIds.size!==Object.keys(stationNames).length)throw new Error("Station list is incomplete");
      const latestMeasured=new Date(Math.max(...observedTimes.map(value=>value.getTime())));
      if(observedTimes.some(value=>now-value.getTime()>2*3600000)){
        staleObservation=latestMeasured;
        throw new Error("Station observations are stale");
      }

      target.replaceChildren();
      stationRows.forEach(station=>{
        const card=document.createElement("article");card.className="weather-observation-station"+(station.measurements.length>6?" weather-observation-station--wide":"");
        const heading=document.createElement("div");heading.className="weather-observation-heading";
        const name=document.createElement("strong");name.textContent=station.name;heading.appendChild(name);
        const number=document.createElement("span");number.textContent="Állomás: "+station.station_number;heading.appendChild(number);card.appendChild(heading);
        const time=document.createElement("p");time.className="weather-observation-time";time.textContent="Mérve: "+format(parseObservationTime(station.observed_at));card.appendChild(time);
        const grid=document.createElement("div");grid.className="weather-observation-measurements";
        if(station.measurements.length){
          station.measurements.forEach(item=>{
            const measurement=document.createElement("div");measurement.className="weather-observation-measurement";
            const label=document.createElement("span");label.textContent=item.label;measurement.appendChild(label);
            const value=document.createElement("strong");value.textContent=item.raw_value.trim()+" "+item.unit;measurement.appendChild(value);
            grid.appendChild(measurement);
          });
          card.appendChild(grid);
        }else{
          const empty=document.createElement("p");empty.className="weather-observation-empty";
          empty.textContent="Ehhez az órához nincs értékelhető mérési adat.";card.appendChild(empty);
        }
        target.appendChild(card);
      });
      sources.replaceChildren();
      [[sourceUrl,"Órás állomásadatok"],[metadataUrl,"Állomáslista"],[termsUrl,"Felhasználási feltételek"]].forEach(([url,label])=>{
        const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label+" ↗";sources.appendChild(link);
      });
      const attributionNode=document.createElement("span");attributionNode.textContent=attribution;sources.appendChild(attributionNode);
      placeholder.hidden=true;badge.textContent="Friss mérések";
      const measuredStations=stationRows.filter(station=>station.measurements.length>0).length;
      status.textContent="Frissítve: "+format(checked)+" · van mérési adat "+measuredStations+"/"+Object.keys(stationNames).length+" állomáson";
      const observationExpiry=Math.min(checked.getTime()+24*3600000,
        ...stationRows.map(station=>parseObservationTime(station.observed_at).getTime()+2*3600000))+1;
      scheduleFreshnessExpiry(observationExpiry,()=>{
        target.replaceChildren();sources.replaceChildren();placeholder.hidden=false;badge.textContent="Nincs friss adat";
        status.textContent="Az állomásmérések lejártak; friss adatot keresünk. Legutóbbi mérés: "+format(latestMeasured)+".";loadWeatherObservations();
      });
    }).catch(()=>{
      target.replaceChildren();sources.replaceChildren();placeholder.hidden=false;badge.textContent="Nincs friss adat";
      status.textContent=staleObservation
        ?"Az állomásadatok nem elég frissek a megjelenítéshez. Legutóbbi mérés: "+format(staleObservation)+". A mérési értékeket nem mutatjuk."
        :"Nincs elérhető, kellően friss állomásmérés";
    });
  }
  function loadCountyProfile(){
    const status=el("county-profile-status");
    const target=el("county-profile-items");
    const placeholder=el("county-profile-placeholder");
    const sources=el("county-profile-sources");
    if(!status||!target||!placeholder||!sources)return;
    const areaUrl="https://www.ksh.hu/stadat_files/fol/hu/fol0006.html";
    const populationUrl="https://www.ksh.hu/stadat_files/fol/hu/fol0007.html";
    const termsUrl="https://www.ksh.hu/copyright";
    const number=new Intl.NumberFormat("hu-HU");
    const parseDate=value=>{
      if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
      const date=new Date(value+"T00:00:00Z");
      return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date:null;
    };
    fetch("/county-profile.json",{cache:"no-store"}).then(async response=>{
      if(!response.ok)throw new Error("County profile unavailable");
      const data=await response.json();
      const checked=typeof data?.source_checked_at==="string"&&data.source_checked_at.length<=64?new Date(data.source_checked_at):null;
      const reference=parseDate(data?.reference_date);
      const metrics=data?.metrics;
      const now=Date.now();
      const area=metrics?.area_km2,population=metrics?.population,settlements=metrics?.settlements,density=metrics?.population_density_per_km2;
      if(data?.schema!=="palocindex.county-profile.v1"||data?.status!=="approved_for_public_release"||data?.published!==false
        ||data?.scope!=="Nógrád vármegye"||data?.sources?.length!==2||data.sources[0]!==areaUrl||data.sources[1]!==populationUrl
        ||data?.terms_url!==termsUrl||data?.attribution!=="Forrás: KSH"||!reference||!checked||!Number.isFinite(checked.getTime())
        ||reference.getTime()>now||now-reference.getTime()>3*366*86400000||checked.getTime()>now+5*60000||now-checked.getTime()>24*3600000
        ||!Number.isInteger(area)||area<2000||area>3000||!Number.isInteger(settlements)||settlements<100||settlements>150
        ||!Number.isInteger(population)||population<100000||population>300000||typeof density!=="number"||!Number.isFinite(density)
        ||density<30||density>120||Math.abs(population/area-density)>1)throw new Error("County profile failed validation");
      const labels=[
        ["Népesség",number.format(population),"fő"],
        ["Település",number.format(settlements),"Nógrád települése"],
        ["Terület",number.format(area),"km²"],
        ["Népsűrűség",new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1}).format(density),"fő/km²"],
      ];
      target.replaceChildren();
      labels.forEach(([label,value,unit])=>{
        const card=document.createElement("article");card.className="county-stat";
        const strong=document.createElement("strong");strong.textContent=value;card.appendChild(strong);
        const name=document.createElement("span");name.textContent=label;card.appendChild(name);
        const small=document.createElement("small");small.textContent=unit;card.appendChild(small);
        target.appendChild(card);
      });
      sources.replaceChildren();
      [[areaUrl,"Terület és népsűrűség"],[populationUrl,"Lakosság és településszám"],[termsUrl,"KSH felhasználási feltételek"]].forEach(([url,label])=>{
        const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=label+" ↗";sources.appendChild(link);
      });
      placeholder.hidden=true;
      status.textContent="KSH referencia: "+new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeZone:"UTC"}).format(reference)
        +" · ellenőrizve: "+new Intl.DateTimeFormat("hu-HU",{dateStyle:"medium",timeZone:"Europe/Budapest"}).format(checked);
      scheduleFreshnessExpiry(Math.min(checked.getTime()+24*3600000,reference.getTime()+3*366*86400000)+1,()=>{
        target.replaceChildren();sources.replaceChildren();placeholder.hidden=false;
        status.textContent="A Nógrád-adatok ellenőrzése lejárt; friss adatot keresünk.";loadCountyProfile();
      });
    }).catch(()=>{
      target.replaceChildren();sources.replaceChildren();placeholder.hidden=false;status.textContent="Nógrád adatai most nem érhetők el friss, ellenőrzött jelöltként";
    });
  }
  window.addEventListener("DOMContentLoaded",()=>{
    el("town-retry")?.addEventListener("click", async()=>{
      if(await loadTowns()) el("town-query")?.focus();
    });
    loadTowns();
    loadAds();
    loadNationalNews();
    loadInternationalNews();
    loadDailyWeather();
    loadWeatherECMWF();
    loadRegionalWeather();
    loadWeatherObservations();
    loadCountyProfile();
  });
})();
