import json, subprocess, time

TERMS = {
 'Teknologi':   ['coworking indonesia', 'kantor startup jakarta', 'programmer indonesia'],
 'Jasa':        ['bengkel motor indonesia', 'salon indonesia', 'jasa laundry'],
 'Perdagangan': ['pasar tradisional indonesia', 'toko kelontong', 'warung kelontong'],
 'Perikanan':   ['nelayan indonesia', 'tambak ikan indonesia', 'pelabuhan ikan indonesia'],
 'Pemodal':     ['business meeting indonesia', 'diskusi bisnis', 'seminar wirausaha indonesia'],
}

def api(term):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&generator=search'
           '&gsrsearch=' + term.replace(' ', '+') +
           '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json')
    out = subprocess.run(['curl','-s','--max-time','30','-A','ModalinDev/1.0',url],
                         capture_output=True, text=True).stdout
    try:
        pages = json.loads(out).get('query',{}).get('pages',{})
    except Exception:
        return []
    res=[]
    for p in pages.values():
        u = (p.get('imageinfo',[{}])[0].get('thumburl') or '').split('?')[0]
        u = u.replace('https://thumb.wikimedia.org','https://upload.wikimedia.org')
        if u.lower().endswith(('.jpg','.jpeg')) and '/thumb/' in u:
            res.append((p['title'][5:], u))
    return res

found = json.load(open('cands.json'))
for sector, terms in TERMS.items():
    got=[]
    for t in terms:
        got += api(t); time.sleep(1.2)
    seen=set(); uniq=[]
    for title,u in got:
        if u in seen: continue
        seen.add(u); uniq.append((title,u))
    found[sector]=uniq[:6]
    print(f'{sector}: {len(uniq[:6])} kandidat')
    for t,_ in uniq[:6]: print('    ', t[:62])

json.dump(found, open('cands.json','w'), indent=0)
