import json, subprocess, urllib.parse, sys

TERMS = {
 'Kuliner':      ['warung+makan+indonesia', 'pedagang+kaki+lima+indonesia'],
 'Kriya':        ['pengrajin+batik', 'pengrajin+rotan+indonesia'],
 'Agrikultur':   ['petani+kopi+indonesia', 'petani+indonesia+panen'],
 'Fesyen':       ['penjahit+indonesia', 'kain+tenun+indonesia'],
 'Teknologi':    ['startup+indonesia+kantor', 'wirausaha+indonesia+laptop'],
 'Jasa':         ['laundry+indonesia', 'bengkel+indonesia'],
 'Perdagangan':  ['pasar+tradisional+indonesia', 'toko+kelontong+indonesia'],
 'Perikanan':    ['nelayan+indonesia', 'budidaya+ikan+indonesia'],
 'Pemodal':      ['rapat+bisnis+indonesia', 'diskusi+usaha+indonesia'],
}

def api(term):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&generator=search'
           f'&gsrsearch={term}&gsrnamespace=6&gsrlimit=8&prop=imageinfo'
           '&iiprop=url&iiurlwidth=1000&format=json')
    out = subprocess.run(['curl','-s','--max-time','25','-A','ModalinDev/1.0',url],
                         capture_output=True, text=True).stdout
    try:
        pages = json.loads(out).get('query',{}).get('pages',{})
    except Exception:
        return []
    res=[]
    for p in pages.values():
        ii = p.get('imageinfo',[{}])[0]
        u = ii.get('thumburl') or ''
        u = u.split('?')[0].replace('https://thumb.wikimedia.org','https://upload.wikimedia.org')
        if u.lower().endswith(('.jpg','.jpeg','.png')) and '/thumb/' in u:
            res.append((p['title'][5:], u))
    return res

found={}
for sector, terms in TERMS.items():
    got=[]
    for t in terms:
        got += api(t)
    seen=set(); uniq=[]
    for title,u in got:
        if u in seen: continue
        seen.add(u); uniq.append((title,u))
    found[sector]=uniq[:6]

json.dump(found, open('cands.json','w'), indent=0)
for s,v in found.items():
    print(f'{s}: {len(v)} kandidat')
