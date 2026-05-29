/* ╔══════════════════════════════════════════════════════════════╗
   ║   AZ ÁRNYKÚP LABIRINTUSA — Interaktív Kalandjáték          ║
   ║   ─────────────────────────────────────────────────────     ║
   ║   Rendszer: állapotgép (state machine) + inventory         ║
   ║   Bővítés: adj hozzá új jeleneteket a `scenes` objektumhoz ║
   ╚══════════════════════════════════════════════════════════════╝ */

// ═══════════════════════════════════════════════
//  JÁTÉKOS ÁLLAPOT
// ═══════════════════════════════════════════════
let player = {
  skill: 0,   // ÜGYESSÉG
  hp: 0,   // ÉLETERŐ
  luck: 0,   // SZERENCSE
  maxSkill: 0,
  maxHp: 0,
  maxLuck: 0,
  inventory: []  // tárgyak neve (string tömbként)
};

// Tárgyak kezelése
function hasItem(name) { return player.inventory.includes(name); }
function addItem(name) {
  if (!hasItem(name)) {
    player.inventory.push(name);
    showNotification('✦ Új tárgy: ' + name);
  }
}
function removeItem(name) {
  player.inventory = player.inventory.filter(i => i !== name);
}

// Stat változtatás
function changeStat(stat, delta) {
  player[stat] = Math.max(0, Math.min(player['max' + capitalize(stat)], player[stat] + delta));
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ═══════════════════════════════════════════════
//  JELENET-ADATBÁZIS
//  ─────────────────────────────────────────────
//  Minden jelenet objektum:
//  {
//    id:       'scene_id',          // egyedi azonosító (string)
//    title:    'Helyszín neve',     // fejlécben jelenik meg
//    text:     ['<p>...</p>', ...], // szövegbekezdések (HTML engedélyezett)
//    onEnter:  function(player){},  // opcionális: belépéskor fut (stat/item változás)
//    choices: [
//      {
//        text:     'Választás szövege',
//        next:     'scene_id',       // hová visz
//        requires: 'tárgy_neve',     // opcionális: ezt a tárgyat kell bírni
//        gives:    'tárgy_neve',     // opcionális: ezt a tárgyat adja
//        removes:  'tárgy_neve',     // opcionális: ezt a tárgyat elveszi
//        hpDelta:  -2,               // opcionális: ÉLETERŐ változás
//        luckDelta: 1,               // opcionális: SZERENCSE változás
//        skillDelta: 0,              // opcionális: ÜGYESSÉG változás
//      }
//    ],
//    ending:   'victory' | 'defeat' | null   // végkifejlet jelzése
//  }
// ═══════════════════════════════════════════════
const scenes = {

  /* ──────────────────────────────────────────────
     KEZDETI JELENET — ide kerül a játékos először
     ────────────────────────────────────────────── */
  start: {
    id: 'start',
    title: 'Prológus — A Hívás',
    text: [
      `<p>Hajnali ének ébreszt: <em>a kő énekel.</em></p>`,
      `<p>Három napja nem emlékszel semmire — csak a sötétségre, amely körülvett, és arra a hangra, amely egyre mélyebbre csalt. Most itt állsz az <strong>Árnykúp</strong> előtt, az ősöreg bazaltszikla tövénél, amelyből évszázadok óta szivárog az a hideg, bíborvörös fény.</p>`,
      `<p>A falusi öregek azt mondják: aki bejut és elhozza az <em>Ősvilág Magját</em> — a mélyen rejtőző kővé vált szívet —, az örök hatalmat nyer az árnyak felett. Aki nem jön ki... azt az útvesztő megemészti.</p>`,
      `<p>Hátizsákodban egy marék élelem, egy rozsdás kard, és valami halvány remény. A bejárat nyitva áll.</p>`,
    ],
    choices: [
      { text: 'Belelépsz a nyílásba. A hideg kő befogad.', next: 'entrance_hall' },
      { text: 'Körülnézel a szikla tövében, hátha találsz valamit.', next: 'search_outside' },
    ]
  },

  /* ── Külső kutatás ── */
  search_outside: {
    id: 'search_outside',
    title: 'A Szikla Töve',
    text: [
      `<p>Mohával borított kövek között turkálsz. Ujjaid valami hidegbe ütköznek: egy apró, ezüstös <em>Árnykő</em> hever a töredezett bazalt alatt.</p>`,
      `<p>A kő a tenyeredben különösen hideg — szinte él. Az öregasszony szavai jutnak eszedbe: <em>"Az Árnykő átment az élő és holt világ határain."</em></p>`,
      `<p>Felmarkolod, és belépsz az üregbe.</p>`,
    ],
    onEnter: function (p) { addItem('Árnykő'); },
    choices: [
      { text: 'Belelépsz a nyílásba.', next: 'entrance_hall' },
    ]
  },

  /* ── Bejárat ── */
  entrance_hall: {
    id: 'entrance_hall',
    title: 'A Bejárati Csarnok',
    text: [
      `<p>A falak izzadnak. Bíborvörös mohák fonják be a köveket; ahol megérintenéd őket, suttogásszerű rezgés fut végig a kőzeten.</p>`,
      `<p>Előtted két folyosó nyílik. A <strong>bal oldali</strong> belőle erős vizes szag árad — talán víz alatti rész. A <strong>jobb oldali</strong>ból szürkés füst kúszik, és halvány kopogás hallatszik.</p>`,
      `<p>A mennyezeten egy régi rúna ég narancssárgán: <em>„Csak az juthat tovább, aki tud hallgatni."</em></p>`,
    ],
    choices: [
      { text: 'A bal folyosóra mégy — a víz szagát követed.', next: 'water_corridor' },
      { text: 'A jobb folyosóra mégy — a kopogást vizsgálod.', next: 'smoke_room' },
      { text: 'Megállsz és figyelsz. Hallgatod a követ.', next: 'listen_rune', luckDelta: 1 },
    ]
  },

  /* ── Hallgatás ── */
  listen_rune: {
    id: 'listen_rune',
    title: 'A Rúna Üzenete',
    text: [
      `<p>Behunyt szemmel állsz. A kő suttog — nem szavakban, hanem képekben. Egy szikrázó mozaikot látsz: az útvesztő vége egy <em>kút</em>, amelynek peremén három csillag ég.</p>`,
      `<p>Valami melegség fut a mellkasodon át. A rúna fénye halványul; úgy érzed, a labirintus valamilyen ismeretlen okból meghajolt előtted.</p>`,
      `<p><strong>SZERENCSE +1</strong> — a labirintus elismeri az érzékenységedet.</p>`,
    ],
    choices: [
      { text: 'A bal folyosóra mégy.', next: 'water_corridor' },
      { text: 'A jobb folyosóra mégy.', next: 'smoke_room' },
    ]
  },

  /* ── Vizes folyosó ── */
  water_corridor: {
    id: 'water_corridor',
    title: 'A Vizes Folyosó',
    text: [
      `<p>Deréktájig ér a fekete víz. Valami surran a lábad mellett — nem ellenséges, inkább kíváncsi. Az alap a csúszós.</p>`,
      `<p>A folyosó egy elágazáshoz vezet: előre egy <strong>félig nyitott acélajtó</strong>, amelynek rozsdás zsanérjai nyikorognak, és bal oldalt egy <strong>szűk rés</strong> a kőzetben — épp hogy elfér rajta egy ember.</p>`,
    ],
    choices: [
      { text: 'Az acélajtón kísérelsz meg átmenni.', next: 'iron_door', hpDelta: -1 },
      { text: 'Átbújsz a szűk résen.', next: 'narrow_gap' },
      { text: 'Visszamész a bejárathoz és a másik folyosóra térsz.', next: 'smoke_room' },
    ]
  },

  /* ── Acélajtó ── */
  iron_door: {
    id: 'iron_door',
    title: 'Az Acélajtó Mögött',
    text: [
      `<p>Az ajtó beleszorult a vizes kőzetbe; nyílásakor a rozsdás vas feldörzsöli a karod. <strong>ÉLETERŐ −1.</strong></p>`,
      `<p>Mögötte egy kis szoba: a közepén csontváz ül trónszerűen egy kőszékben. A mellkasán csillog valami — egy <em>Régi Kulcs</em>.</p>`,
      `<p>A csontváz üres szemgödrei feléd fordulnak. Semmi sem mozdul.</p>`,
    ],
    onEnter: function (p) { addItem('Régi Kulcs'); },
    choices: [
      { text: 'Elveszed a kulcsot, és sietve visszatérsz a főfolyosóra.', next: 'crossroads' },
      { text: 'Megszólítod a csontvázat — tán tudja a járatot.', next: 'skeleton_talk' },
    ]
  },

  /* ── Csontvázzal beszélgetés ── */
  skeleton_talk: {
    id: 'skeleton_talk',
    title: 'A Csontváz Üzenete',
    text: [
      `<p><em>„Kalandor... végre valaki."</em></p>`,
      `<p>A csontváz állkapcsa lassan mozdul. Hangja csont-csikorgás és szél keveréke.</p>`,
      `<p><em>„Az Ősvilág Magját az <strong>Árnyfüggöny</strong> rejti. Csak az juthat oda, aki átmegy a Tükörszobán, és nem néz a saját arcába. Én néztem. Látod, mi lettem."</em></p>`,
      `<p>Az állkapocs elcsuklik. A csontváz ismét mozdulatlan.</p>`,
    ],
    choices: [
      { text: 'Megszívleled a tanácsot, és visszatérsz a folyosóra.', next: 'crossroads', luckDelta: 1 },
    ]
  },

  /* ── Szűk rés ── */
  narrow_gap: {
    id: 'narrow_gap',
    title: 'A Szűk Rés',
    text: [
      `<p>A rés úgy szorít, mint egy kőmarkolat. Átpréseled magad — a másik oldalon száraz, meleg levegő fogad.</p>`,
      `<p>Egy kör alakú szobában találod magad. A közepén <em>öt kőoszlop</em> áll, mindegyiken más szimbólum: Hold, Nap, Kígyó, Kéz, Szem. Az oszlopok között egy rácsos lyukon át látni a mélységet.</p>`,
      `<p>A falon karcolt felirat: <em>„Nyomd meg a kettőt, amely ellentét, és az út megnyílik."</em></p>`,
    ],
    choices: [
      { text: 'Hold és Nap — az éjszaka és nappal ellentéte.', next: 'pillar_correct', gives: 'Keresztút Térképe' },
      { text: 'Kígyó és Kéz — az állat és az ember ellentéte.', next: 'pillar_wrong', hpDelta: -2 },
      { text: 'Nem nyomkodod az oszlopokat, mész a főfolyosón.', next: 'crossroads' },
    ]
  },

  /* ── Helyes oszlop ── */
  pillar_correct: {
    id: 'pillar_correct',
    title: 'Az Oszlopok Titka',
    text: [
      `<p>Ahogy egyszerre nyomod meg a <em>Hold</em> és <em>Nap</em> szimbólumot, a kő mélyen morajlik. Egy titkos fiók pattan ki a padlóból.</p>`,
      `<p>Benne egy viaszpecséttel lezárt, fátyolpapírra karcolt <em>Keresztút Térképe</em> lapul. A széthajtott térkép az útvesztő középső szakaszát mutatja — egyértelmű jelzéssel, hogyan kerülhető el az Árnycsapda.</p>`,
      `<p>Értékes zsákmány. Folytatod az utad.</p>`,
    ],
    choices: [
      { text: 'Visszatérsz a főfolyosóra.', next: 'crossroads' },
    ]
  },

  /* ── Rossz oszlop ── */
  pillar_wrong: {
    id: 'pillar_wrong',
    title: 'A Csapda',
    text: [
      `<p>Nyomás alatt a kő megmozdul — de nem úgy, ahogy vártad. A padlóból apró kőnyilak lövellnek ki. Kettő találat. <strong>ÉLETERŐ −2.</strong></p>`,
      `<p>A fájdalom éles, de nem halálos. Tántorogva, de talpon maradsz.</p>`,
    ],
    choices: [
      { text: 'Visszatérsz a főfolyosóra.', next: 'crossroads' },
      { text: 'Megpróbálod a Hold és Nap oszlopot.', next: 'pillar_correct', gives: 'Keresztút Térképe' },
    ]
  },

  /* ── Füstös szoba ── */
  smoke_room: {
    id: 'smoke_room',
    title: 'A Füstös Kamra',
    text: [
      `<p>A szoba alig nagyobb egy szekrénynél. Egy alacsony kőpadon <em>Rethak</em> ül — a labirintus ismert lakója, félvér goblin és kereskedő egyszemélyben. Arca sebhelyekkel teli, de a szemei okosak.</p>`,
      `<p><em>„Kalandor!"</em> — köszönt vidáman. <em>„Nem sokan jutnak idáig épségben. Cserélnél? Van nálam Gyógyfű és egy Fénykő. De nem adom ingyen."</em></p>`,
    ],
    choices: [
      { text: 'Elfogadod az alkut: odaadod az Árnykővet a Gyógyfűért.', next: 'rethak_trade_herb', requires: 'Árnykő', removes: 'Árnykő', gives: 'Gyógyfű' },
      { text: 'Elfogadod az alkut: odaadod az Árnykővet a Fénykőért.', next: 'rethak_trade_light', requires: 'Árnykő', removes: 'Árnykő', gives: 'Fénykő' },
      { text: 'Rábeszélöd, hogy térképet kérsz cserébe.', next: 'rethak_trade_map', requires: 'Árnykő', removes: 'Árnykő', gives: 'Keresztút Térképe' },
      { text: 'Nem cserélsz. Búcsút intesz és továbbb mégy.', next: 'crossroads' },
    ]
  },

  rethak_trade_herb: {
    id: 'rethak_trade_herb',
    title: 'Az Alku Megköttetett',
    text: [
      `<p>Rethak az Árnykőre pislant, majd kacsingatva áttolja a Gyógyfüvet. <em>„Okos döntés. A mélységben sok a seb."</em></p>`,
      `<p>A száraz, aromás fű frissítően hat már önmagában is. Tudod: egy kötésnyi elég lesz, hogy három sebet begyógyítson.</p>`,
    ],
    onEnter: function (p) { changeStat('hp', 3); showNotification('Gyógyfű felhasználva: ÉLETERŐ +3'); },
    choices: [
      { text: 'Tovabb mégy a labirintusba.', next: 'crossroads' },
    ]
  },

  rethak_trade_light: {
    id: 'rethak_trade_light',
    title: 'Az Alku Megköttetett',
    text: [
      `<p>A Fénykő halványan izzik a tenyeredben. Rethak int: <em>„A sötét szakaszon nélküle elveszítesz mindent. Bölcs csere."</em></p>`,
      `<p>A követ elteszed. A továbbiakban a sötétség nem fog lassítani.</p>`,
    ],
    choices: [
      { text: 'Folytatod az utad.', next: 'crossroads' },
    ]
  },

  rethak_trade_map: {
    id: 'rethak_trade_map',
    title: 'Egy Különleges Alku',
    text: [
      `<p>Rethak felhúzza a szemöldökét. <em>„Nem sokan kérik a térképet. Általában a fénykőt akarják."</em> Hosszan nézegeti az Árnykőt, majd bólint. <em>„Rendben. Tudod, hogy az Árnykő keleten háromszoros értéket ér? De ha a térkép kell, legyen."</em></p>`,
      `<p>Átnyújtja a vázlatot. A szívközeli ösvény be van jelölve rajta.</p>`,
    ],
    choices: [
      { text: 'Folytatod az utad.', next: 'crossroads' },
    ]
  },

  /* ── Keresztút ── */
  crossroads: {
    id: 'crossroads',
    title: 'A Nagy Keresztút',
    text: [
      `<p>A folyosók itt találkoznak egy tágasabb, nyolcszögletű teremben. A mennyezet itt magasodik a leginkább — harminc láb legalább. Fent egy hasadékon beszivárog a holdvilág, és ezüstösen megvilágítja a köveket.</p>`,
      `<p>Három irány kínálkozik: <strong>észak</strong> felé egy kőkapun át egy halk zene szól — valami idegen és gyönyörű. <strong>Keletre</strong> az árnyak sűrűbbek a természetesnél; az út ott mélyebb sötétségbe vész. <strong>Délen</strong> a visszaút van — de ott már tudod, nem sok minden vár rád.</p>`,
      `<p>Ha van nálad <em>Keresztút Térképe</em>, egy pillantás elegendő: a középső mélyút az egyenes ösvény az Árnyfüggönyhöz.</p>`,
    ],
    choices: [
      { text: 'Követed az északi zenét.', next: 'music_room' },
      { text: 'Bemérsz a keleti árnyakba. (Fénykő ajánlott)', next: 'dark_passage' },
      { text: 'A térkép alapján az egyenes középúton mégy.', next: 'shadow_curtain', requires: 'Keresztút Térképe' },
      { text: 'Visszafordulsz — ez túl veszélyes.', next: 'escape_ending' },
    ]
  },

  /* ── Zenés szoba ── */
  music_room: {
    id: 'music_room',
    title: 'A Zene Forrása',
    text: [
      `<p>A szobában egy <em>Árnyéklény</em> lebeg — test nélküli alak, amely dallamot énekel a falaknak. Megjelenésed megállítja.</p>`,
      `<p>Szemetek találkozik — noha a lénynek nincs szeme. Aztán lassan, mintha döntene valamit, megmutat neked egy képet a levegőben: <em>a Tükörszoba belső arca, ahol a lény él.</em></p>`,
      `<p>Figyelmeztetés? Csapda? Vagy segítség?</p>`,
    ],
    choices: [
      { text: 'Megpróbálod kommunikálni: bólintasz köszönettel.', next: 'music_room_peace', luckDelta: 1, gives: 'Árnyéklény Ajándéka' },
      { text: 'Kardot rántasz — az ilyen lények veszélyesek.', next: 'music_room_fight', hpDelta: -3 },
      { text: 'Visszahúzódsz és más úton mégy.', next: 'crossroads' },
    ]
  },

  music_room_peace: {
    id: 'music_room_peace',
    title: 'Szövetség az Árnnyal',
    text: [
      `<p>A lény bólint — legalábbis így értelmezed azt a lebegő hullámot. Egy apró árnyéktöredéket csöpögtet a markodalba; az megkeményedik, mint egy fekete üvegcsepp.</p>`,
      `<p><em>Árnyéklény Ajándéka</em> — senki sem tudja pontosan, mire jó, de van valami erő benne, ami megvéd egy halálos csapástól.</p>`,
      `<p><strong>SZERENCSE +1</strong>. A labirintus néha jutalmaz.</p>`,
    ],
    choices: [
      { text: 'Visszatérsz a keresztúthoz.', next: 'crossroads' },
    ]
  },

  music_room_fight: {
    id: 'music_room_fight',
    title: 'Hiba Volt',
    text: [
      `<p>A lény nem harcol — csak rezeg, és a rezonancia majdnem feltépi a válladat. Egy pillanat alatt eltűnik. <strong>ÉLETERŐ −3.</strong></p>`,
      `<p>A szobában csend van. A lehetőség elveszett.</p>`,
    ],
    choices: [
      { text: 'Visszatérsz a keresztúthoz.', next: 'crossroads' },
    ]
  },

  /* ── Sötét folyosó ── */
  dark_passage: {
    id: 'dark_passage',
    title: 'A Sötét Folyosó',
    text: [
      `<p>A sötétség valódi — nem pusztán a fény hiánya, hanem valami sűrű, tapintható anyag. Tapogatózol.</p>`,
    ],
    choices: [
      { text: 'A Fénykő fénye megvilágítja az utat.', next: 'dark_passage_lit', requires: 'Fénykő' },
      { text: 'Vakon tapogatózol előre.', next: 'dark_passage_blind', hpDelta: -3 },
    ]
  },

  dark_passage_lit: {
    id: 'dark_passage_lit',
    title: 'Megvilágított Ösvény',
    text: [
      `<p>A Fénykő halk, fehér fénye szétűzi a sűrűséget. A folyosó végigvezet egy félelmetes hasadékon — de te látod az ösvényt, és biztosan lépsz.</p>`,
      `<p>A másik oldalon: az <strong>Árnyfüggöny Terme</strong>.</p>`,
    ],
    choices: [
      { text: 'Belépsz az Árnyfüggöny Termébe.', next: 'shadow_curtain' },
    ]
  },

  dark_passage_blind: {
    id: 'dark_passage_blind',
    title: 'Vakban',
    text: [
      `<p>Háromszor botlasz el a sziklafalon. Az utolsó esés a legrosszabb — <strong>ÉLETERŐ −3</strong>. Ha így is életben maradsz, a fal mögötti résben ott van a terme.</p>`,
    ],
    choices: [
      { text: 'Ha van még erőd, belépsz.', next: 'shadow_curtain' },
      { text: 'Túl gyenge vagy — visszafordulsz.', next: 'escape_ending' },
    ]
  },

  /* ── Tükörszoba ── */
  shadow_curtain: {
    id: 'shadow_curtain',
    title: 'Az Árnyfüggöny Terme',
    text: [
      `<p>A terem közepe üres — és tele van. Egy hatalmas, függönyszerű árnyékfal húzódik szélétől széléig. Mögötte halvány arany fény dereng.</p>`,
      `<p>A csontváz szavai visszhangzanak: <em>„Ne nézz a saját arcodba."</em></p>`,
      `<p>A függöny jobbra tükörszerű — megmutatja, aki te vagy. Vagy aki lehetnél. Előtted három út:</p>`,
    ],
    choices: [
      { text: 'Behunyt szemmel lépesz át a függönyön — a csontváz szavát megfogadva.', next: 'curtain_closed_eyes' },
      { text: 'Belenézel a tükörbe, aztán átlépsz.', next: 'curtain_mirror_look', hpDelta: -4 },
      { text: 'Az Árnyéklény Ajándékát tartod magad elé védelemként és átmégy.', next: 'curtain_gift', requires: 'Árnyéklény Ajándéka' },
    ]
  },

  /* ── Függöny — behunyt szemmel ── */
  curtain_closed_eyes: {
    id: 'curtain_closed_eyes',
    title: 'Vak Átkelés',
    text: [
      `<p>Lépsz. A hőmérséklet zuhan, aztán emelkedik. Egy pillanatra mintha két kéz nyúlna feléd az árnyakból — de nem érnek hozzád.</p>`,
      `<p>Amikor kinyitod a szemed, az arany fény áraszt el. A terem közepén, egy kőtalpazaton, ott van: az <em>Ősvilág Magja</em>. Egy ökölnyi, szürkésfekete kő, amelynek belsejéből lüktet a fény.</p>`,
    ],
    choices: [
      { text: 'Felemeled a Magot.', next: 'final_choice' },
    ]
  },

  /* ── Függöny — tükörbe nézve ── */
  curtain_mirror_look: {
    id: 'curtain_mirror_look',
    title: 'A Tükör Csapdája',
    text: [
      `<p>A tükör megmutatja arcodat — de más arc ez. Egy arc, amelyen évek ülnek, fájdalom és hatalom egyszerre. Az arc mosolyog rád, te nem mosolygod vissza.</p>`,
      `<p>Az átkelés megtörténik, de az árnyak szakítanak belőled valamit. <strong>ÉLETERŐ −4.</strong> Mégis, a másik oldalon ott a Mag.</p>`,
    ],
    choices: [
      { text: 'Felemeled a Magot, ha még tudod tartani.', next: 'final_choice' },
    ]
  },

  /* ── Függöny — ajándékkal ── */
  curtain_gift: {
    id: 'curtain_gift',
    title: 'Az Árny Visszahív',
    text: [
      `<p>Az Árnyéklény ajándéka a függöny előtt elolvad — de nem veszíted el. Inkább... visszaadja magát a függönynek, mintha hazatérne.</p>`,
      `<p>A függöny megnyílik előtted. Egy pillanatra mintha halkan énekelt volna.</p>`,
      `<p>A másik oldalon ott ragyog az <em>Ősvilág Magja</em>.</p>`,
    ],
    onEnter: function (p) { removeItem('Árnyéklény Ajándéka'); },
    choices: [
      { text: 'Felemeled a Magot.', next: 'final_choice' },
    ]
  },

  /* ── Végső döntés ── */
  final_choice: {
    id: 'final_choice',
    title: 'Az Ősvilág Magja',
    text: [
      `<p>A kő nehezebb, mint gondolnád. Melegség árad belőle — nem hő, hanem <em>tudat</em>. Mintha valami nagyon régi figyelnének rád.</p>`,
      `<p>Egy hang szólal meg — nincs irány, nincs forrás:</p>`,
      `<p><em>„Három út van előtted, kalandor. Vidd el a követ, és hatalmat kapsz az árnyak felett — de soha nem hagyhatsz el minket. Hagyd itt, és szabad leszel — de a labirintus örökre bezárul. Vagy ajánld fel nekünk, és mi megmutatjuk, mi van a fal mögött."</em></p>`,
    ],
    choices: [
      { text: 'Elviszed a Magot. A hatalom csábítása győz.', next: 'ending_power' },
      { text: 'Visszahelyezed a talpazatra. A szabadság a fontosabb.', next: 'ending_freedom' },
      { text: 'Felajánlod a Magot. Kíváncsiságod erősebb a félelemnél.', next: 'ending_truth' },
    ]
  },

  /* ══════════════════════════════════
     VÉGKIFEJLETEK
  ══════════════════════════════════ */

  /* ── Hatalom végkifejlet ── */
  ending_power: {
    id: 'ending_power',
    title: 'Az Árny Ura',
    text: [
      `<p>A Mag belevésődik a markodba. Nem fáj — de tudod, hogy örök nyom marad.</p>`,
      `<p>Kimész a labirintusból. A napfény más most — szürkébbnek látszik, mintha egy filter fedné. Az emberek arca ismerős, de valahogy távolibb.</p>`,
      `<p>Az árnyak engedelmeskednek. Te parancsolsz nekik. De az éjszaka egyre hosszabb, és néha — éjszaka — úgy érzed, hogy a labirintus még mindig vár rád.</p>`,
      `<p><em>A hatalom ára az örök kötöttség.</em></p>`,
    ],
    ending: 'victory',
    choices: []
  },

  /* ── Szabadság végkifejlet ── */
  ending_freedom: {
    id: 'ending_freedom',
    title: 'A Szabad Kalandor',
    text: [
      `<p>Visszateszed a követ. A terem megremeg — aztán elcsendesedik.</p>`,
      `<p>A visszaút nyitva van. Gyorsan, biztosan jutsz ki. A bejárat mögötted kővé dermed — egy szikla lezárja örökre.</p>`,
      `<p>Kint állsz. A levegő tiszta. A hold feljött. Semmi erőd nincs az árnyak felett — de szabad vagy, és az élet előtted van.</p>`,
      `<p><em>A szabadság ára a lemondás. De néha ez a legjobb üzlet.</em></p>`,
    ],
    ending: 'victory',
    choices: []
  },

  /* ── Igazság végkifejlet ── */
  ending_truth: {
    id: 'ending_truth',
    title: 'A Fal Mögött',
    text: [
      `<p>A Mag eltűnik a kezedből. A terem falai olvadni kezdenek — nem omolnak össze, hanem <em>kinyílnak</em>.</p>`,
      `<p>Mögöttük egy másik világ: nem sötét, nem fényes, hanem <strong>mindkettő egyszerre</strong>. Az Árnylények mindenfelé vannak, és most látod, kik ők valójában: egy régi emberi civilizáció emlékezete, amely a kőbe ivódott.</p>`,
      `<p>Te az első vagy, aki évszázadok óta meghallja a válaszukat. Visszatérsz — de más vagy. És a történet, amelyet elmesélsz, megváltoztatja a világot.</p>`,
      `<p><em>A kíváncsiság a legveszélyesebb — és a legjutalmazóbb — erény.</em></p>`,
    ],
    ending: 'victory',
    choices: []
  },

  /* ── Menekülés végkifejlet ── */
  escape_ending: {
    id: 'escape_ending',
    title: 'A Visszaút',
    text: [
      `<p>Visszafordulsz. A labirintus nem üldöz — csak figyel.</p>`,
      `<p>Kijutsz. Az Ősvilág Magja odamarad, a mélységben, és a bejárat reggel beomlik mögötted, mintha sosem lett volna.</p>`,
      `<p>Élsz. Ez is eredmény.</p>`,
      `<p><em>Egy nap esetleg visszajössz. Ha megvan a bátorságod.</em></p>`,
    ],
    ending: 'defeat',
    choices: []
  },

  /* ══════════════════════════════════
     HALÁL (ÉLETERŐ = 0 ESETÉN)
  ══════════════════════════════════ */
  dead: {
    id: 'dead',
    title: 'A Vég',
    text: [
      `<p>Erőd elfogy. A kő hideg, és a sötétség beköltözik.</p>`,
      `<p>Talán egyszer valaki más eljut idáig, és megtalálja a csontjaidat — és a nyomaidból tanul.</p>`,
      `<p><em>Az Árnykúp tovább vár.</em></p>`,
    ],
    ending: 'defeat',
    choices: []
  },

}; // ── scenes vége ──


// ═══════════════════════════════════════════════
//  RENDER MOTOR
// ═══════════════════════════════════════════════

let currentSceneId = 'start';

/** Jelenet megjelenítése */
function renderScene(sceneId) {
  // Halál ellenőrzés
  if (player.hp <= 0 && sceneId !== 'start' && sceneId !== 'dead') {
    sceneId = 'dead';
  }

  currentSceneId = sceneId;
  const scene = scenes[sceneId];
  if (!scene) { console.error('Ismeretlen jelenet:', sceneId); return; }

  // onEnter hook
  if (scene.onEnter) scene.onEnter(player);

  // Fejléc
  const heading = document.getElementById('scene-heading');
  heading.style.animation = 'none';
  heading.textContent = scene.title || '';
  void heading.offsetWidth; // reflow
  heading.style.animation = 'fade-in 0.5s ease forwards';

  // Szöveg
  const textEl = document.getElementById('scene-text');
  textEl.style.animation = 'none';
  textEl.innerHTML = scene.text.join('');
  void textEl.offsetWidth;
  textEl.style.animation = 'fade-in 0.6s ease 0.1s forwards';

  // Választások
  const choicesEl = document.getElementById('choices-area');
  choicesEl.style.animation = 'none';
  choicesEl.innerHTML = '';
  void choicesEl.offsetWidth;
  choicesEl.style.animation = 'fade-in 0.5s ease 0.35s forwards';

  if (scene.choices && scene.choices.length > 0) {
    scene.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';

      const meetsReq = !choice.requires || hasItem(choice.requires);

      let label = `<span class="choice-num">${idx + 1}.</span> ${choice.text}`;
      if (choice.requires && !meetsReq) {
        label += `<span class="req-badge">Kell: ${choice.requires}</span>`;
      }
      if (choice.gives) {
        label += `<span class="item-badge">✦ ${choice.gives}</span>`;
      }
      btn.innerHTML = label;

      if (!meetsReq) {
        btn.disabled = true;
        btn.title = `Ehhez kell: ${choice.requires}`;
      } else {
        btn.onclick = () => handleChoice(choice);
      }
      choicesEl.appendChild(btn);
    });
  }

  // Végkifejlet
  const outcomeArea = document.getElementById('outcome-area');
  const restartBtn = document.getElementById('restart-btn');
  if (scene.ending) {
    const banner = document.getElementById('outcome-banner');
    banner.className = 'outcome-banner ' + scene.ending;
    banner.textContent = scene.ending === 'victory' ? '✦ Kalandod véget ért — győztesen ✦' : '✦ Kalandod itt ért véget ✦';
    outcomeArea.classList.add('visible');
    outcomeArea.style.animation = 'none';
    void outcomeArea.offsetWidth;
    outcomeArea.style.animation = 'fade-in 0.6s ease 0.5s forwards';
    restartBtn.classList.add('visible');
  } else {
    outcomeArea.classList.remove('visible');
    restartBtn.classList.remove('visible');
  }

  // Stat frissítés
  updateStats();
  updateInventory();

  // Scroll tetejére (mobilon fontos)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Választás kezelése */
function handleChoice(choice) {
  // Tárgy adás/elvétel
  if (choice.gives) addItem(choice.gives);
  if (choice.removes) removeItem(choice.removes);

  // Stat változtatások
  if (choice.hpDelta) changeStat('hp', choice.hpDelta);
  if (choice.luckDelta) changeStat('luck', choice.luckDelta);
  if (choice.skillDelta) changeStat('skill', choice.skillDelta);

  // Értesítők
  if (choice.hpDelta && choice.hpDelta < 0)
    showNotification(`⚔ ÉLETERŐ ${choice.hpDelta}`);
  if (choice.hpDelta && choice.hpDelta > 0)
    showNotification(`✦ ÉLETERŐ +${choice.hpDelta}`);
  if (choice.luckDelta && choice.luckDelta > 0)
    showNotification(`★ SZERENCSE +${choice.luckDelta}`);

  renderScene(choice.next);
}

/** Stat megjelenítés frissítése */
function updateStats() {
  const s = document.getElementById('stat-skill');
  const h = document.getElementById('stat-hp');
  const l = document.getElementById('stat-luck');

  s.textContent = player.skill;
  h.textContent = player.hp;
  l.textContent = player.luck;

  // Szín-jelzés
  h.className = 'stat-value' + (player.hp <= 4 ? ' low' : player.hp <= 8 ? ' med' : '');
  l.className = 'stat-value' + (player.luck <= 3 ? ' low' : player.luck <= 6 ? ' med' : '');
}

/** Tárgyak megjelenítése */
function updateInventory() {
  const el = document.getElementById('inventory-items');
  if (player.inventory.length === 0) {
    el.innerHTML = '<span class="inv-empty">üres</span>';
  } else {
    el.innerHTML = player.inventory.map(i => `<span class="inv-item">${i}</span>`).join('');
  }
}

/** Értesítő megjelenítése */
let notifTimer = null;
function showNotification(msg) {
  const n = document.getElementById('notification');
  n.textContent = msg;
  n.classList.add('show');
  if (notifTimer) clearTimeout(notifTimer);
  notifTimer = setTimeout(() => n.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════
//  INICIALIZÁLÁS
// ═══════════════════════════════════════════════

function initPlayer() {
  // Dobókocka szimulálás (1–6)
  const d6 = () => Math.floor(Math.random() * 6) + 1;

  player.skill = d6() + 6;   // Harcos alap
  player.hp = d6() * 2 + 12;
  player.luck = d6() + 6;
  player.maxSkill = player.skill;
  player.maxHp = player.hp;
  player.maxLuck = player.luck;
  player.inventory = [];
}

function restartGame() {
  initPlayer();
  renderScene('start');
}

// ── Indítás ──
initPlayer();
renderScene('start');
