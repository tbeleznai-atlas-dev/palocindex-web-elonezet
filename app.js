"use strict";
const articles = {
 "hir-helyi": { category:"Helyi hírek · bemutató",title:"Így jelennek majd meg a települési hírek", intro:"Helyi hírek, hivatalos közlemények és forrásmegjelölések településenként.",steps:["Egy önkormányzati vagy hivatalos forrás nyilvános közleményét a hírgyűjtő feldolgozza.","Ellenőrizzük az eredeti forrást, a közzététel dátumát és az érintett települést.","Az ellenőrzött tartalom szerkesztői jóváhagyás után jelenhet meg."],note:"Ez szerkesztési példa, nem valódi aktuális hír." },
 "hir-orokseg": { category:"Örökség · bemutató",title:"Fedezzük fel együtt a Palócföld értékeit",intro:"A táj, a hagyományok és az épített örökség helye a PalócIndexen.",steps:["Helyi forrásból gyűjtjük a történeteket és a fényképek eredetét.","A szerkesztőség hitelesíti a helyszínt és a leírást.","A cikkhez kapcsolódó település saját rovatot kap."],note:"Demócikk, nem tudósítás."},
 "hir-kozosseg": {category:"Közösség · bemutató",title:"Helyi programok és közösségi kezdeményezések",intro:"A kisebb települések programjainak is legyen saját, könnyen kereshető helye.",steps:["Az eseményt hivatalos szervező vagy ellenőrzött forrás alapján rögzítjük.","A dátumot és a helyszínt publikálás előtt ellenőrizzük.","Lejárt esemény automatikusan átkerülhet az archívumba."],note:"Ez nem meghirdetett esemény."},
 "hir-telepules":{category:"Települések · bemutató",title:"131 település – egy közös információs tér",intro:"Egy helyen kereshető Nógrád összes települése.",steps:["Válassz települést a keresőből.","Megjelenik a település neve és járása.","A további hivatalos, ellenőrzött hírek később kapcsolódhatnak hozzá."],note:"A településnév-adatbázis működik; hír- és programadatbázis nem éles."},
 "kert-palanta":{category:"Kertészkedés",title:"Palántanevelés otthon",intro:"A vetés sikeréhez a megfelelő fény, nedvesség és fokozatos szoktatás fontos.",steps:["Nézd meg a vetőmag csomagján a vetési időt és a javasolt mélységet.","Használj tiszta, jó vízelvezetésű edényt és laza palántaföldet.","Tartsd nyirkosan a földet, de ne álljon víz az edény alján.","Kiültetés előtt fokozatosan szoktasd a növényeket a kinti levegőhöz."],note:"Fagyérzékeny palántát csak a fagyveszély elmúltával ültess ki."},
 "kert-rozsa":{category:"Kertészkedés",title:"Miért sárgul a rózsa levele?",intro:"A levélsárgulás mögött többféle környezeti vagy kórokozó-eredetű ok állhat.",steps:["Ellenőrizd a talaj vízellátását és a vízelvezetést.","Vizsgáld meg a leveleket foltok, kártevők és gombás elváltozások szempontjából.","Nézd meg, mennyi közvetlen napfényt kap a rózsa.","Csak azonosított ok alapján avatkozz be."],note:"Növényvédő szereket kizárólag az engedélyezett felhasználás szerint alkalmazz."},
 "kert-naptar":{category:"Kertészkedés",title:"Egyszerű vetési és ültetési napló",intro:"Készíts saját, településedhez és kertedhez igazított évszakos teendőlistát.",steps:["Írd fel a vetés és a kiültetés napját.","Jegyezd fel a napsütést, a csapadékot és a talaj állapotát.","Kövesd a csírázást és a fejlődést.","A következő évben használd a megfigyeléseidet."],note:"A tényleges vetési időpont fajtánként és időjárástól függően eltérhet."},
 "haz-vizko":{category:"Házi praktikák",title:"Vízkő eltávolítása kíméletesen",intro:"A felület anyagának megfelelő módszert válassz, és mindig próbáld ki egy kis területen.",steps:["Ellenőrizd a felület gyártói tisztítási útmutatóját.","Savra érzékeny természetes kövön ne használj savas tisztítószert.","Megfelelő felületen rövid időre használható enyhe citromsavas oldat.","Alaposan öblítsd és szárítsd meg a felületet."],note:"Klórtartalmú tisztítószert soha ne keverj savas szerrel."},
 "haz-energia":{category:"Házi praktikák",title:"Kis lépések az energiatakarékosságért",intro:"A legegyszerűbb módszer a fogyasztás megismerése és a pazarlás csökkentése.",steps:["Figyeld meg a nagy fogyasztók működési idejét.","Használd a készülékek megfelelő takarékos programjait.","Gondoskodj a radiátorok körüli szabad légáramlásról.","Hasonlítsd össze a fogyasztást hasonló időszakokban."],note:"Villamos szerelési vagy gázkészülék-beavatkozást bízz képesített szakemberre."},
 "haz-otthon":{category:"Házi praktikák",title:"Rendszerezés napi tizenöt percben",intro:"Nem kell egyszerre az egész házat rendbe tenni: elég egy kis terület.",steps:["Válassz egyetlen polcot vagy fiókot.","Válogasd külön a gyakran használt tárgyakat.","Tedd a helyükre a megtartott dolgokat.","A következő alkalommal újabb kis területet rendezz."],note:"Ez életmódtipp, nem speciális takarítási vagy egészségügyi tanács."}
};
const townData = Array.isArray(window.PALOC_TOWNS) ? window.PALOC_TOWNS : [];
const townSelect = document.getElementById("townSelect");
const searchInput = document.getElementById("townSearch");
const note = document.getElementById("selectionNote");
const suggestions = document.getElementById("searchSuggestions");
const modal = document.getElementById("articleModal");
const modalBody = document.getElementById("modalBody");
const modalTitleId = "modalTitle";
let previousFocus = null;
const normalize = value => String(value || "").toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
function escapeHTML(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));}
function findTown(raw){const q=normalize(raw);return townData.find(t=>normalize(t.name)===q) || townData.find(t=>normalize(t.name).startsWith(q));}
function activateTown(town){
 if(!town)return;
 townSelect.value=town.name;
 document.getElementById("weatherPlace").textContent=town.name;
 note.hidden=false;
 note.textContent="Kiválasztott település: "+town.name+" · "+town.district+". A települési hírek még nem élő adatforrásból származnak.";
 document.getElementById("townResult").textContent=town.name+" – "+town.district+". Az ellenőrzött önkormányzati hírek és események később jelenhetnek meg itt.";
 suggestions.hidden=true;
 try{localStorage.setItem("palocindex-preview-town",town.name)}catch{}
}
function setSuggestions(value){
 const q=normalize(value);
 if(q.length<2){suggestions.hidden=true;return;}
 const matches=townData.filter(t=>normalize(t.name).includes(q)).slice(0,8);
 suggestions.replaceChildren();
 for(const t of matches){const btn=document.createElement("button");btn.type="button";btn.textContent=t.name+" · "+t.district;btn.addEventListener("click",()=>{searchInput.value=t.name;activateTown(t);document.getElementById("onkormanyzat").scrollIntoView({behavior:"smooth"});});suggestions.append(btn);}
 suggestions.hidden=matches.length===0;
}
townSelect.addEventListener("change",()=>{const t=townData.find(x=>x.name===townSelect.value);if(t)activateTown(t);});
for(const t of townData){const opt=document.createElement("option");opt.value=t.name;opt.textContent=t.name;townSelect.append(opt);}
searchInput.addEventListener("input",()=>setSuggestions(searchInput.value));
document.addEventListener("click",event=>{if(!suggestions.contains(event.target)&&event.target!==searchInput)suggestions.hidden=true});
document.getElementById("globalSearch").addEventListener("submit",event=>{
 event.preventDefault();const q=searchInput.value.trim();if(!q){searchInput.focus();return}
 const t=findTown(q);if(t){activateTown(t);document.getElementById("onkormanyzat").scrollIntoView({behavior:"smooth"});return;}
 const matches=Object.entries(articles).filter(([,a])=>normalize(a.title+" "+a.intro+" "+a.category).includes(normalize(q)));
 note.hidden=false;note.replaceChildren();
 const msg=document.createElement("span");msg.textContent=matches.length?"Találatok a bemutató tartalomban: "+matches.length+" · ":"Nincs ilyen település vagy bemutatócikk. Próbálj másik kifejezést.";
 note.append(msg);
 for(const [id,a] of matches.slice(0,5)){const b=document.createElement("button");b.type="button";b.textContent=a.title+" →";b.style.cssText="border:0;background:transparent;color:#095b8b;margin:4px;font-weight:750";b.addEventListener("click",()=>openArticle(id));note.append(b);}
 document.getElementById("hirek").scrollIntoView({behavior:"smooth"});
});
document.querySelectorAll("[data-target]").forEach(btn=>btn.addEventListener("click",()=>{
 const target=document.getElementById(btn.dataset.target);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}));
function openArticle(id){
 const a=articles[id];if(!a)return;
 previousFocus=document.activeElement;
 modalBody.replaceChildren();
 const tag=document.createElement("span");tag.className="modal-tag";tag.textContent=a.category;
 const title=document.createElement("h2");title.id=modalTitleId;title.textContent=a.title;
 const intro=document.createElement("p");intro.textContent=a.intro;
 const list=document.createElement("ol");for(const step of a.steps){const li=document.createElement("li");li.textContent=step;list.append(li)}
 const caution=document.createElement("p");caution.className="modal-caution";caution.textContent=a.note||"Ismeretterjesztő tartalom.";
 modalBody.append(tag,title,intro,list,caution);
 if(id==="kert-palanta"){const b=document.createElement("button");b.className="read-story";b.textContent="Rózsaápolási tippek →";b.addEventListener("click",()=>openArticle("kert-rozsa"));modalBody.append(b);}
 if(id==="haz-vizko"){const b=document.createElement("button");b.className="read-story";b.textContent="További otthoni tippek →";b.addEventListener("click",()=>openArticle("haz-energia"));modalBody.append(b);}
 modal.hidden=false;document.body.style.overflow="hidden";document.getElementById("closeModal").focus();
}
function closeArticle(){modal.hidden=true;document.body.style.overflow="";if(previousFocus && previousFocus.isConnected)previousFocus.focus();}
document.querySelectorAll("[data-article]").forEach(btn=>btn.addEventListener("click",()=>openArticle(btn.dataset.article)));
document.querySelectorAll("[data-close-modal]").forEach(el=>el.addEventListener("click",closeArticle));
document.getElementById("closeModal").addEventListener("click",closeArticle);
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!modal.hidden)closeArticle();});
document.getElementById("allStoriesBtn").addEventListener("click",()=>{
 note.hidden=false;note.textContent="A hírgyűjtő és moderáló rendszer éles adatkapcsolata még nem aktív. Az alábbiak csak mintacikkek.";
 document.getElementById("hirek").scrollIntoView({behavior:"smooth"});
});
try { const remembered=localStorage.getItem("palocindex-preview-town");const t=townData.find(x=>x.name===remembered);if(t)activateTown(t); }catch{}
