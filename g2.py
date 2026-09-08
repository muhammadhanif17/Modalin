import json, subprocess, time, re, urllib.parse

TERMS = {
 'Kuliner':     ['warung makan indonesia', 'pedagang kaki lima indonesia'],
 'Kriya':       ['pengrajin batik', 'pengrajin rotan indonesia'],
 'Agrikultur':  ['petani kopi indonesia', 'perkebunan kopi indonesia'],
 'Fesyen':      ['penjahit indonesia', 'kain tenun indonesia'],
 'Teknologi':   ['wirausaha indonesia laptop', 'kantor startup indonesia'],
 'Jasa':        ['bengkel motor indonesia', 'jasa laundry indonesia'],
 'Perdagangan': ['pasar tradisional indonesia', 'toko kelontong indonesia'],
 'Perikanan':   ['nelayan indonesia', 'tambak ikan indonesia'],
 'Pemodal':     ['diskusi bisnis indonesia', 'seminar wirausaha indonesia'],
}
W = 900

def norm(u):
    u = u.split('?')[0].replace('https://thumb.wikimedia.org', 'https://upload.wikimedia.org')
    if '/thumb/' in u:
        return re.sub(r'/\d+px-', f'/{W}px-', u)
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons)/(\w)/(\w{2})/(.+)$', u)
    if not m: return None
    b, a, ab, name = m.groups()
    return f'{b}/thumb/{a}/{ab}/{name}/{W}px-{name}'

def api(term):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='
           + urllib.parse.quote(term)
           + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json')
    out = subprocess.run(['curl','-s','--max-time','30','-A','ModalinDev/1.0',url],
                         capture_output=True, text=True).stdout
    try: pages = json.loads(out).get('query',{}).get('pages',{})
    except Exception: return []
    res=[]
    for p in pages.values():
        ii = p.get('imageinfo',[{}])[0]
        raw = ii.get('thumburl') or ii.get('url') or ''
        if not raw.split('?')[0].lower().endswith(('.jpg','.jpeg','.png')): continue
        n = norm(raw)
        if n: res.append((p['title'][5:-4], n))
    return res

final={}
for sector, terms in TERMS.items():
    got=[]
    for t in terms:
        got += api(t); time.sleep(1.5)
    seen=set(); uniq=[]
    for title,u in got:
        if u in seen: continue
        seen.add(u); uniq.append((title,u))
    final[sector]=uniq[:3]
    print(f'{sector:13s} {len(uniq[:3])}')
    for t,_ in uniq[:3]: print('               ', t[:58])
json.dump(final, open('final.json','w'), indent=1)
