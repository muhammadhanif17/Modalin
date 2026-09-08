import json, subprocess, time, re, urllib.parse

TERMS = {
 'Kuliner':      ['warung makan indonesia', 'pedagang kaki lima indonesia'],
 'Kriya':        ['pengrajin batik', 'pengrajin rotan indonesia'],
 'Agrikultur':   ['petani kopi indonesia', 'petani indonesia panen'],
 'Fesyen':       ['penjahit indonesia', 'kain tenun indonesia'],
 'Teknologi':    ['wirausaha indonesia laptop', 'kantor startup indonesia'],
 'Jasa':         ['bengkel motor indonesia', 'jasa laundry indonesia'],
 'Perdagangan':  ['pasar tradisional indonesia', 'toko kelontong indonesia'],
 'Perikanan':    ['nelayan indonesia', 'tambak ikan indonesia'],
 'Pemodal':      ['diskusi bisnis indonesia', 'seminar wirausaha indonesia'],
}
W = 900

def thumb(u):
    """Ubah URL berkas asli jadi URL thumbnail berukuran tetap."""
    u = u.split('?')[0].replace('https://thumb.wikimedia.org', 'https://upload.wikimedia.org')
    if '/thumb/' in u:
        return re.sub(r'/\d+px-', f'/{W}px-', u)
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons)/(\w)/(\w{2})/(.+)$', u)
    if not m:
        return None
    base, a, ab, name = m.groups()
    return f'{base}/thumb/{a}/{ab}/{name}/{W}px-{name}'

def api(term):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='
           + urllib.parse.quote(term) +
           '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiprop=url&iiurlwidth=1000&format=json')
    out = subprocess.run(['curl','-s','--max-time','30','-A','ModalinDev/1.0',url],
                         capture_output=True, text=True).stdout
    try:
        pages = json.loads(out).get('query',{}).get('pages',{})
    except Exception:
        return []
    res = []
    for p in pages.values():
        ii = p.get('imageinfo',[{}])[0]
        raw = ii.get('thumburl') or ii.get('url') or ''
        if not raw.lower().split('?')[0].endswith(('.jpg','.jpeg','.png')):
            continue
        t = thumb(raw)
        if t:
            res.append((p['title'][5:], t))
    return res

def alive(u):
    code = subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code}','--max-time','20',
                           '-A','ModalinDev/1.0', u], capture_output=True, text=True).stdout
    return code == '200'

final = {}
for sector, terms in TERMS.items():
    cands = []
    for t in terms:
        cands += api(t); time.sleep(0.8)
    ok, seen = [], set()
    for title, u in cands:
        if u in seen: continue
        seen.add(u)
        if alive(u):
            ok.append(u)
        if len(ok) >= 3: break
    final[sector] = ok
    print(f'{sector:14s} {len(ok)} foto terverifikasi')

json.dump(final, open('final.json','w'), indent=1)
