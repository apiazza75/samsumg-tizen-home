/* Milano Home icon set - ES5, inline SVG artwork on a coloured tile.
   window.MH_ICONS[key] = { names, ids, bg, tint, svg }
   svg is the artwork only (viewBox 0 0 100 100); the tile background is `bg`. */
(function () {
  var F = 'font-family="Figtree, Arial, sans-serif"';
  function T(txt, x, y, size, extra) {
    return '<text x="' + x + '" y="' + y + '" ' + F + ' font-size="' + size + '" text-anchor="middle" dominant-baseline="central" ' + (extra || '') + '>' + txt + '</text>';
  }
  function S(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>'; }

  var MH_ICONS = {

    netflix: {
      names: ['netflix'], ids: ['netflix'],
      bg: '#000000', tint: '#e50914',
      svg: S('<polygon points="30,16 42,16 42,84 30,84" fill="#b1060f"/><polygon points="58,16 70,16 70,84 58,84" fill="#b1060f"/><polygon points="30,16 42,16 70,84 58,84" fill="#e50914"/>')
    },

    primevideo: {
      names: ['prime video', 'amazon prime video', 'primevideo', 'amazon prime'], ids: ['primevideo'],
      bg: '#00a8e1', tint: '#00a8e1',
      svg: S(T('prime', 50, 30, 21, 'fill="#ffffff" font-weight="700" textLength="56" lengthAdjust="spacingAndGlyphs"') +
             T('video', 50, 51, 21, 'fill="#ffffff" font-weight="700" textLength="56" lengthAdjust="spacingAndGlyphs"') +
             '<path d="M24 72 Q50 86 74 70" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M68 64 L76 69.5 L68 77" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    },

    disneyplus: {
      names: ['disney+', 'disney plus', 'disney', 'disneyplus'], ids: ['disney'],
      bg: 'linear-gradient(160deg,#0b2a7a 0%,#040f3a 100%)', tint: '#1b48d6',
      svg: S('<path d="M22 40 Q50 14 80 36" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>' +
             T('Disney+', 50, 57, 18, 'fill="#ffffff" font-weight="800" textLength="68" lengthAdjust="spacingAndGlyphs"'))
    },

    dazn: {
      names: ['dazn'], ids: ['dazn'],
      bg: '#0c161c', tint: '#1f2a30',
      svg: S(T('DAZN', 50, 50, 25, 'fill="#f8f8f8" font-weight="800" textLength="68" lengthAdjust="spacingAndGlyphs"'))
    },

    raiplay: {
      names: ['raiplay', 'rai play'], ids: ['raiplay'],
      bg: '#0c4bd6', tint: '#0c4bd6',
      svg: S('<rect x="16" y="37" width="28" height="26" rx="6" fill="#ffffff"/>' +
             T('Rai', 30, 50, 14, 'fill="#0c4bd6" font-weight="800" textLength="21" lengthAdjust="spacingAndGlyphs"') +
             T('Play', 66, 50, 19, 'fill="#ffffff" font-weight="800" textLength="36" lengthAdjust="spacingAndGlyphs"'))
    },

    timvision: {
      names: ['timvision', 'tim vision'], ids: ['Timvision', 'timvision'],
      bg: 'linear-gradient(160deg,#0a2a6b 0%,#04163d 100%)', tint: '#0048a6',
      svg: S(T('TIM', 50, 39, 28, 'fill="#ffffff" font-weight="800" textLength="52" lengthAdjust="spacingAndGlyphs"') +
             T('VISION', 50, 63, 16, 'fill="#ffffff" font-weight="700" textLength="64" lengthAdjust="spacingAndGlyphs"'))
    },

    infinity: {
      names: ['mediaset infinity', 'infinity', 'infinity+', 'mediaset play', 'mediaset'], ids: ['infinity'],
      bg: 'linear-gradient(160deg,#1a1a1a 0%,#000000 100%)', tint: '#2a8cff',
      svg: S('<defs><linearGradient id="mh-inf-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#7a5cff"/></linearGradient></defs>' +
             '<path d="M50 38 C 42 27 24 27 24 38 C 24 49 42 49 50 38 C 58 27 76 27 76 38 C 76 49 58 49 50 38" fill="none" stroke="url(#mh-inf-g)" stroke-width="6" stroke-linecap="round"/>' +
             T('infinity', 50, 66, 19, 'fill="#ffffff" font-weight="700" textLength="58" lengthAdjust="spacingAndGlyphs"'))
    },

    now: {
      names: ['now', 'now tv', 'nowtv', 'now sky'], ids: [],
      bg: '#000000', tint: '#00c267',
      svg: S('<defs><linearGradient id="mh-now-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00e676"/><stop offset="1" stop-color="#2979ff"/></linearGradient></defs>' +
             T('NOW', 50, 50, 27, 'fill="url(#mh-now-g)" font-weight="800" textLength="66" lengthAdjust="spacingAndGlyphs"'))
    },

    skygo: {
      names: ['sky go', 'skygo', 'sky'], ids: ['skygo'],
      bg: 'linear-gradient(160deg,#0b1a3a 0%,#02081a 100%)', tint: '#0072c9',
      svg: S('<defs><linearGradient id="mh-sky-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a00"/><stop offset="0.35" stop-color="#ff1e56"/><stop offset="0.7" stop-color="#7b2ff7"/><stop offset="1" stop-color="#0067ff"/></linearGradient></defs>' +
             T('sky', 50, 42, 34, 'fill="url(#mh-sky-g)" font-weight="800" textLength="54" lengthAdjust="spacingAndGlyphs"') +
             T('go', 50, 68, 22, 'fill="#ffffff" font-weight="700" textLength="26" lengthAdjust="spacingAndGlyphs"'))
    },

    spotify: {
      names: ['spotify'], ids: ['spotify'],
      bg: '#191414', tint: '#1db954',
      svg: S('<circle cx="50" cy="50" r="34" fill="#1db954"/>' +
             '<path d="M31 41 C 42 35.5 60 36.5 71 43" fill="none" stroke="#191414" stroke-width="6.5" stroke-linecap="round"/>' +
             '<path d="M34 52 C 44 47.5 58 48.5 67 54" fill="none" stroke="#191414" stroke-width="5.5" stroke-linecap="round"/>' +
             '<path d="M37 62 C 45 58.5 56 59.5 63 64" fill="none" stroke="#191414" stroke-width="4.5" stroke-linecap="round"/>')
    },

    youtube: {
      names: ['youtube', 'tizentube', 'youtube tv', 'you tube'], ids: ['youtube', 'tizentube'],
      bg: '#ff0000', tint: '#ff0000',
      svg: S('<rect x="18" y="29" width="64" height="42" rx="13" fill="#ffffff"/><polygon points="43,39 43,61 62,50" fill="#ff0000"/>')
    },

    jellyfin: {
      names: ['jellyfin'], ids: ['jellyfin'],
      bg: 'linear-gradient(135deg,#aa5cc3 0%,#00a4dc 100%)', tint: '#7a62c9',
      svg: S('<path fill-rule="evenodd" fill="#ffffff" d="M50 20 C 38 42 19 56 19 68 C 19 79 81 79 81 68 C 81 56 62 42 50 20 Z M50 44 C 44 54 36 62 36 68 C 36 73 64 73 64 68 C 64 62 56 54 50 44 Z"/>')
    },

    plex: {
      names: ['plex'], ids: ['plex'],
      bg: '#282a2d', tint: '#e5a00d',
      svg: S('<polygon points="30,18 50,18 70,50 50,82 30,82 50,50" fill="#e5a00d"/>')
    },

    moonlight: {
      names: ['moonlight', 'moonlight game streaming'], ids: ['moonlight'],
      bg: 'linear-gradient(160deg,#283593 0%,#0d1b4a 100%)', tint: '#3949ab',
      svg: S('<path d="M65 20 A30 30 0 1 0 65 80 A34 34 0 0 1 65 20 Z" fill="#ffffff"/>' +
             '<circle cx="73" cy="32" r="2.2" fill="#ffffff"/><circle cx="80" cy="48" r="1.6" fill="#ffffff"/><circle cx="71" cy="62" r="1.6" fill="#ffffff"/>')
    },

    xbox: {
      names: ['xbox', 'xbox game pass', 'xbox cloud gaming', 'game pass'], ids: ['xbox'],
      bg: '#107c10', tint: '#107c10',
      svg: S('<circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="6"/>' +
             '<path d="M33 33 C 42 40 58 60 67 67" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>' +
             '<path d="M67 33 C 58 40 42 60 33 67" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>')
    },

    internet: {
      names: ['internet', 'samsung internet', 'browser', 'web browser'], ids: ['org.tizen.browser'],
      bg: 'linear-gradient(135deg,#5b48e0 0%,#3b2fb8 100%)', tint: '#5b4fdc',
      svg: S('<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round">' +
             '<circle cx="50" cy="50" r="30"/><ellipse cx="50" cy="50" rx="13" ry="30"/>' +
             '<path d="M20 50 H80"/><path d="M24 36 H76"/><path d="M24 64 H76"/></g>')
    },

    airplay: {
      names: ['airplay', 'apple airplay', 'airplay e homekit', 'airplay and homekit'], ids: ['airplay'],
      bg: '#1c1c1e', tint: '#5e5ce6',
      svg: S('<path d="M38 68 H24 A6 6 0 0 1 18 62 V30 A6 6 0 0 1 24 24 H76 A6 6 0 0 1 82 30 V62 A6 6 0 0 1 76 68 H62" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
             '<polygon points="50,54 30,80 70,80" fill="#ffffff"/>')
    },

    appletv: {
      names: ['apple tv', 'apple tv+', 'appletv', 'apple tv plus'], ids: ['appletv'],
      bg: '#000000', tint: '#2b2b2b',
      svg: S(T('tv+', 50, 50, 40, 'fill="#ffffff" font-weight="700" textLength="60" lengthAdjust="spacingAndGlyphs"'))
    },

    paramountplus: {
      names: ['paramount+', 'paramount plus', 'paramount'], ids: ['paramount'],
      bg: 'linear-gradient(160deg,#1b64d8 0%,#0a3fa8 100%)', tint: '#0064ff',
      svg: S('<g fill="#ffffff"><circle cx="16.2" cy="49.7" r="2"/><circle cx="22.4" cy="38.9" r="2"/><circle cx="32" cy="30.8" r="2"/><circle cx="43.7" cy="26.5" r="2"/><circle cx="56.3" cy="26.5" r="2"/><circle cx="68" cy="30.8" r="2"/><circle cx="77.6" cy="38.9" r="2"/><circle cx="83.8" cy="49.7" r="2"/></g>' +
             '<polygon points="24,66 50,34 76,66" fill="#ffffff"/><polygon points="50,34 58,44 54,46 50,42 46,46 42,44" fill="#cfe0ff"/>' +
             T('Paramount+', 50, 79, 12, 'fill="#ffffff" font-weight="800" textLength="68" lengthAdjust="spacingAndGlyphs"'))
    },

    twitch: {
      names: ['twitch'], ids: ['twitch'],
      bg: '#9146ff', tint: '#9146ff',
      svg: S('<polygon points="30,18 22,34 22,72 38,72 38,84 50,72 64,72 78,58 78,18" fill="#ffffff"/>' +
             '<rect x="50" y="33" width="7" height="20" fill="#9146ff"/><rect x="64" y="33" width="7" height="20" fill="#9146ff"/>')
    },

    tvplus: {
      names: ['samsung tv plus', 'tv plus', 'tvplus', 'samsung tv+'], ids: ['tvplus'],
      bg: 'linear-gradient(135deg,#6a11cb 0%,#2575fc 100%)', tint: '#5b3fd9',
      svg: S(T('TV', 50, 40, 34, 'fill="#ffffff" font-weight="800" textLength="46" lengthAdjust="spacingAndGlyphs"') +
             T('Plus', 50, 67, 20, 'fill="#ffffff" font-weight="700" textLength="40" lengthAdjust="spacingAndGlyphs"'))
    },

    crunchyroll: {
      names: ['crunchyroll'], ids: ['crunchyroll'],
      bg: '#f47521', tint: '#f47521',
      svg: S('<circle cx="50" cy="50" r="30" fill="#ffffff"/><circle cx="58" cy="56" r="22" fill="#f47521"/>')
    },

    discoveryplus: {
      names: ['discovery+', 'discovery plus', 'discovery'], ids: ['discovery'],
      bg: 'linear-gradient(160deg,#0f2a5f 0%,#2a7de1 100%)', tint: '#2175d9',
      svg: S('<g fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"><circle cx="50" cy="33" r="12"/><ellipse cx="50" cy="33" rx="5" ry="12"/><path d="M38 33 H62"/></g>' +
             T('discovery+', 50, 65, 15, 'fill="#ffffff" font-weight="700" textLength="70" lengthAdjust="spacingAndGlyphs"'))
    },

    rakutentv: {
      names: ['rakuten tv', 'rakutentv', 'rakuten'], ids: ['rakuten'],
      bg: '#bf0000', tint: '#bf0000',
      svg: S(T('Rakuten', 50, 41, 19, 'fill="#ffffff" font-weight="800" textLength="68" lengthAdjust="spacingAndGlyphs"') +
             T('TV', 50, 65, 24, 'fill="#ffffff" font-weight="800" textLength="32" lengthAdjust="spacingAndGlyphs"'))
    },

    plutotv: {
      names: ['pluto tv', 'plutotv', 'pluto'], ids: ['pluto'],
      bg: '#000000', tint: '#f0b400',
      svg: S('<circle cx="50" cy="38" r="15" fill="#ffffff"/><ellipse cx="50" cy="38" rx="27" ry="6.5" fill="none" stroke="#ffd200" stroke-width="4" transform="rotate(-18 50 38)"/>' +
             T('pluto tv', 50, 73, 17, 'fill="#ffffff" font-weight="700" textLength="60" lengthAdjust="spacingAndGlyphs"'))
    },

    chili: {
      names: ['chili', 'chili tv'], ids: ['chili'],
      bg: '#000000', tint: '#e4002b',
      svg: S(T('CHILI', 50, 50, 26, 'fill="#e4002b" font-weight="800" textLength="66" lengthAdjust="spacingAndGlyphs"'))
    },

    kodi: {
      names: ['kodi'], ids: ['kodi'],
      bg: '#12b2e7', tint: '#12b2e7',
      svg: S('<g fill="#ffffff"><polygon points="50,20 34,36 66,36"/><polygon points="20,50 36,34 36,66"/><polygon points="80,50 64,34 64,66"/><polygon points="50,80 34,64 66,64"/></g>')
    },

    steamlink: {
      names: ['steam link', 'steamlink', 'steam'], ids: ['steam'],
      bg: '#1b2838', tint: '#66c0f4',
      svg: S('<circle cx="50" cy="50" r="29" fill="none" stroke="#ffffff" stroke-width="6"/>' +
             '<circle cx="61" cy="39" r="11" fill="none" stroke="#ffffff" stroke-width="5"/>' +
             '<circle cx="38" cy="62" r="7.5" fill="#ffffff"/><path d="M42 58 L53 47" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>')
    },

    geforcenow: {
      names: ['geforce now', 'geforcenow', 'nvidia geforce now', 'nvidia'], ids: ['geforce', 'nvidia'],
      bg: '#000000', tint: '#76b900',
      svg: S('<path d="M18 42 Q50 14 82 42 Q50 70 18 42 Z" fill="none" stroke="#76b900" stroke-width="5" stroke-linejoin="round"/><circle cx="50" cy="42" r="9" fill="#76b900"/>' +
             T('NOW', 50, 76, 17, 'fill="#ffffff" font-weight="800" textLength="42" lengthAdjust="spacingAndGlyphs"'))
    },

    emby: {
      names: ['emby'], ids: ['emby'],
      bg: '#52b54b', tint: '#52b54b',
      svg: S('<path fill-rule="evenodd" fill="#ffffff" d="M50 18 L82 50 L50 82 L18 50 Z M42 36 L66 50 L42 64 Z"/>')
    },

    applemusic: {
      names: ['apple music', 'applemusic'], ids: ['applemusic'],
      bg: 'linear-gradient(180deg,#fb5c74 0%,#fa233b 100%)', tint: '#fa243c',
      svg: S('<g fill="#ffffff"><circle cx="36" cy="67" r="8"/><circle cx="64" cy="61" r="8"/><rect x="40" y="26" width="4.5" height="41"/><rect x="68" y="20" width="4.5" height="41"/><polygon points="40,26 72.5,20 72.5,30 40,36"/></g>')
    },

    amazonmusic: {
      names: ['amazon music', 'amazonmusic'], ids: ['amazonmusic'],
      bg: 'linear-gradient(135deg,#25d1da 0%,#0f9db8 100%)', tint: '#25d1da',
      svg: S('<g fill="#ffffff"><circle cx="43" cy="52" r="7.5"/><rect x="47" y="18" width="4.5" height="34"/><path d="M51 18 C 62 24 66 32 59 44 C 61 35 57 30 51 26 Z"/></g>' +
             '<path d="M26 70 Q50 84 72 68" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M66 61 L73 67 L65 73" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    },

    tidal: {
      names: ['tidal'], ids: ['tidal'],
      bg: '#000000', tint: '#4a4a4a',
      svg: S('<g fill="#ffffff"><polygon points="30,30 40,40 30,50 20,40"/><polygon points="50,30 60,40 50,50 40,40"/><polygon points="70,30 80,40 70,50 60,40"/><polygon points="50,50 60,60 50,70 40,60"/></g>')
    },

    deezer: {
      names: ['deezer'], ids: ['deezer'],
      bg: '#a238ff', tint: '#a238ff',
      svg: S('<g fill="#ffffff"><rect x="20" y="64" width="12" height="5"/><rect x="20" y="56" width="12" height="5"/>' +
             '<rect x="35" y="64" width="12" height="5"/><rect x="35" y="56" width="12" height="5"/><rect x="35" y="48" width="12" height="5"/><rect x="35" y="40" width="12" height="5"/>' +
             '<rect x="50" y="64" width="12" height="5"/><rect x="50" y="56" width="12" height="5"/><rect x="50" y="48" width="12" height="5"/>' +
             '<rect x="65" y="64" width="12" height="5"/><rect x="65" y="56" width="12" height="5"/><rect x="65" y="48" width="12" height="5"/><rect x="65" y="40" width="12" height="5"/><rect x="65" y="32" width="12" height="5"/></g>')
    },

    infuse: {
      names: ['infuse'], ids: ['infuse'],
      bg: 'linear-gradient(135deg,#ff9f1a 0%,#ff3d3d 100%)', tint: '#ff6a3d',
      svg: S('<path d="M50 16 C 44 30 68 40 69 58 C 70 71 60 82 50 82 C 40 82 30 71 31 58 C 32 50 39 46 40 38 C 44 45 50 48 48 56 C 54 50 56 34 50 16 Z" fill="#ffffff"/>')
    },

    hbomax: {
      names: ['hbo max', 'hbomax', 'max', 'hbo'], ids: ['hbomax', 'hbo'],
      bg: 'linear-gradient(135deg,#0a1f6b 0%,#1d58d8 100%)', tint: '#0e3fa8',
      svg: S(T('HBO', 50, 39, 25, 'fill="#ffffff" font-weight="800" textLength="54" lengthAdjust="spacingAndGlyphs"') +
             T('MAX', 50, 63, 25, 'fill="#ffffff" font-weight="800" textLength="56" lengthAdjust="spacingAndGlyphs"'))
    },

    tim: {
      names: ['tim', 'tim tv', 'tim box'], ids: [],
      bg: '#0047bb', tint: '#0047bb',
      svg: S(T('TIM', 50, 50, 32, 'fill="#ffffff" font-weight="800" textLength="60" lengthAdjust="spacingAndGlyphs"'))
    },

    vlc: {
      names: ['vlc', 'vlc media player', 'vlc for tizen'], ids: ['vlc'],
      bg: 'linear-gradient(180deg,#ffffff 0%,#ececec 100%)', tint: '#f58a1f',
      svg: S('<rect x="22" y="72" width="56" height="10" rx="5" fill="#8a8a8a"/>' +
             '<path d="M41 18 H59 L72 74 H28 Z" fill="#f78b20"/>' +
             '<polygon points="37.5,34 62.5,34 64.5,42 35.5,42" fill="#ffffff"/><polygon points="33,52 67,52 69,60 31,60" fill="#ffffff"/>')
    },

    smartthings: {
      names: ['smartthings', 'smart things'], ids: ['smartthings'],
      bg: 'linear-gradient(135deg,#1e88e5 0%,#0d5fb8 100%)', tint: '#1e88e5',
      svg: S('<g stroke="#ffffff" stroke-width="9" stroke-linecap="round"><path d="M50 22 V78"/><path d="M50 22 V78" transform="rotate(60 50 50)"/><path d="M50 22 V78" transform="rotate(120 50 50)"/></g>')
    },

    hdmi: {
      names: ['hdmi', 'hdmi 1', 'hdmi 2', 'hdmi 3', 'hdmi 4'], ids: ['hdmi'],
      bg: '#475569', tint: '#64748b',
      svg: S('<rect x="44" y="62" width="12" height="18" rx="3" fill="#ffffff"/>' +
             '<path d="M20 32 H80 V52 L72 64 H28 L20 52 Z" fill="#475569" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"/>' +
             '<g fill="#ffffff"><rect x="29" y="40" width="3" height="9"/><rect x="35" y="40" width="3" height="9"/><rect x="41" y="40" width="3" height="9"/><rect x="47" y="40" width="3" height="9"/><rect x="53" y="40" width="3" height="9"/><rect x="59" y="40" width="3" height="9"/><rect x="65" y="40" width="3" height="9"/></g>')
    },

    tizenbrew: {
      names: ['tizenbrew', 'tizen brew'], ids: ['tizenbrew'],
      bg: 'linear-gradient(135deg,#f7971e 0%,#ff6a00 100%)', tint: '#ff7a00',
      svg: S('<path d="M26 40 H66 V60 A14 14 0 0 1 52 74 H40 A14 14 0 0 1 26 60 Z" fill="#ffffff"/>' +
             '<path d="M66 46 H72 A8 8 0 0 1 72 62 H66" fill="none" stroke="#ffffff" stroke-width="5"/>' +
             '<rect x="20" y="78" width="56" height="5" rx="2.5" fill="#ffffff"/>' +
             '<path d="M74 14 L76.5 22.5 L85 25 L76.5 27.5 L74 36 L71.5 27.5 L63 25 L71.5 22.5 Z" fill="#ffffff"/>')
    },

    settings: {
      names: ['settings', 'impostazioni'], ids: [],
      bg: '#4b5563', tint: '#6b7280',
      svg: S('<g fill="#ffffff"><rect x="45" y="13" width="10" height="14" rx="2"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(45 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(90 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(135 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(180 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(225 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(270 50 50)"/><rect x="45" y="13" width="10" height="14" rx="2" transform="rotate(315 50 50)"/></g>' +
             '<circle cx="50" cy="50" r="22" fill="none" stroke="#ffffff" stroke-width="10"/>')
    },

    home: {
      names: ['home', 'milano home'], ids: [],
      bg: '#3b82f6', tint: '#3b82f6',
      svg: S('<path d="M50 20 L18 48 H28 V78 H44 V60 H56 V78 H72 V48 H82 Z" fill="#ffffff"/>')
    },

    power: {
      names: ['power', 'power off', 'spegni'], ids: [],
      bg: '#dc2626', tint: '#dc2626',
      svg: S('<path d="M35 29 A26 26 0 1 0 65 29" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/><path d="M50 18 V50" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>')
    },

    apps: {
      names: ['apps', 'all apps', 'tutte le app', 'applicazioni'], ids: [],
      bg: '#6b7280', tint: '#6b7280',
      svg: S('<g fill="#ffffff"><rect x="14" y="14" width="18" height="18" rx="4"/><rect x="41" y="14" width="18" height="18" rx="4"/><rect x="68" y="14" width="18" height="18" rx="4"/><rect x="14" y="41" width="18" height="18" rx="4"/><rect x="41" y="41" width="18" height="18" rx="4"/><rect x="68" y="41" width="18" height="18" rx="4"/><rect x="14" y="68" width="18" height="18" rx="4"/><rect x="41" y="68" width="18" height="18" rx="4"/><rect x="68" y="68" width="18" height="18" rx="4"/></g>')
    }
  };

  window.MH_ICONS = MH_ICONS;
})();
