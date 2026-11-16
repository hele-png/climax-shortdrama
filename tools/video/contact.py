import sys,subprocess,glob,os
from PIL import Image
fs=sorted(glob.glob(sys.argv[1])); out=sys.argv[2]; tiles=[]
for f in fs:
    d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
    row=[]
    for k,t in enumerate([0.3,d*0.35,d*0.7,d-0.3]):
        p=f'/tmp/fr_{os.path.basename(f)}_{k}.jpg'
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',f,'-frames:v','1','-vf','scale=180:320',p])
        row.append(Image.open(p))
    tiles.append(row)
W=Image.new('RGB',(180*4*2+10,320*((len(tiles)+1)//2)),'white')
for i,row in enumerate(tiles):
    for k,im in enumerate(row): W.paste(im,((i%2)*(180*4+10)+k*180,(i//2)*320))
W.save(out,quality=85)
