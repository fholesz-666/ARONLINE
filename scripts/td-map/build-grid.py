# Digitalizace izokeraunické mapy ČR (Prozik Data/izomapa.jpg – zdroj ČHMÚ, Atlas podnebí Česka 2007).
# Vstupní obrázek není součástí repozitáře (licence). Spuštění: python3 build-grid.py ve složce s izomapa.jpg.
# Výstup tdgrid.json se převádí do src/data/td-cz-grid.ts.
import numpy as np, json
from PIL import Image
from scipy import ndimage
im=np.array(Image.open('izomapa.jpg').convert('RGB')).astype(float)
cols=[im[46:54,cx-8:cx+8].reshape(-1,3).mean(0) for cx in (455,490,525,560,597)]
print([c.round() for c in cols])
H,W,_=im.shape
# nearest legend colour per pixel, with distance
d=np.stack([np.linalg.norm(im-c,axis=-1) for c in cols],-1)
cls=d.argmin(-1)+1; dmin=d.min(-1)
valid=dmin<45
# country mask: inside thick black border -> fill. Use dark border pixels
dark=im.sum(-1)<200
lab,n=ndimage.label(~dark)
outside=lab==lab[0,0]
# also exclude legend region and right-top white outside blobs connected to edges
edge_labels=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
outside=np.isin(lab,list(edge_labels))
inside=~outside & ~dark
inside[:95,420:]=False
print('inside px',inside.sum())
# fill invalid (text, rivers, dots) by nearest valid class inside
good=inside&valid
idx=ndimage.distance_transform_edt(~good,return_distances=False,return_indices=True)
clsf=cls[idx[0],idx[1]]
# mode filter 5x5 to remove river lines
from scipy.ndimage import generic_filter
def mode(v):
    v=v.astype(int); return np.bincount(v,minlength=6).argmax()
clsm=generic_filter(clsf,mode,size=5)
cx=[318.53254,92.62619,-0.7671,-0.27035,-2.98975,-0.46725]; cy=[183.3845,-0.60435,-141.7536,-0.56072,1.96047,7.43003]
def topx(lon,lat):
    a=lon-15.5;b=lat-49.8;f=np.array([1,a,b,a*a,a*b,b*b]);return f@cx,f@cy
# fill mask (border pixels count as inside)
from scipy.ndimage import binary_fill_holes
country=binary_fill_holes(~outside)
country[:95,420:]=False
LON0,LON1,LAT0,LAT1=12.05,18.90,48.53,51.08
DLON,DLAT=0.04,0.025
nx=int(round((LON1-LON0)/DLON)); ny=int(round((LAT1-LAT0)/DLAT))
rows=[]
for j in range(ny):
    lat=LAT1-(j+0.5)*DLAT; r=''
    for i in range(nx):
        lon=LON0+(i+0.5)*DLON
        x,y=topx(lon,lat); xi,yi=int(round(x)),int(round(y))
        if 0<=xi<W and 0<=yi<H and country[yi,xi]: r+=str(clsm[yi,xi])
        else: r+='0'
    rows.append(r)
json.dump({'lon0':LON0,'lat1':LAT1,'dlon':DLON,'dlat':DLAT,'nx':nx,'ny':ny,'rows':rows},open('tdgrid.json','w'))
print(nx,ny)
for r in rows[::4]: print(r[::2].replace('0',' '))
# render check
vis=np.zeros((ny,nx,3),np.uint8)
pal=[(255,255,255),(250,250,250),(200,220,235),(100,180,225),(10,150,200),(20,80,120)]
for j,r in enumerate(rows):
    for i,c in enumerate(r): vis[j,i]=pal[int(c)] if c!='0' else (255,200,200)
Image.fromarray(vis).resize((nx*4,ny*4),Image.NEAREST).save('grid.png')
g=np.array([[int(c) for c in r] for r in rows])
g2=g.copy()
for j in range(ny):
    for i in range(nx):
        if g[j,i]==0: continue
        win=g[max(0,j-1):j+2,max(0,i-1):i+2].ravel(); win=win[win>0]
        b=np.bincount(win,minlength=6)
        if b[g[j,i]]<=2: g2[j,i]=b.argmax()
rows=[''.join(map(str,r)) for r in g2]
json.dump({'lon0':LON0,'lat1':LAT1,'dlon':DLON,'dlat':DLAT,'nx':nx,'ny':ny,'rows':rows},open('tdgrid.json','w'))
def q(lon,lat):
    i=int((lon-LON0)/DLON); j=int((LAT1-lat)/DLAT); return rows[j][i]
for name,lon,lat in [('Jablonec',15.171,50.724),('Praha',14.42,50.08),('Brno',16.61,49.19),('Šumava Prachatice',13.99,49.01),('Ostrava',18.29,49.83),('Liberec',15.056,50.767),('Svitavy',16.47,49.76)]:
    print(name,q(lon,lat))
