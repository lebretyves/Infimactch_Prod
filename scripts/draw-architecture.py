from pathlib import Path
from html import escape
import math
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdfium2 as pdfium

out=Path('annexe/diagrams');out.mkdir(exist_ok=True)
W,H=1600,1360
pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:\Windows\Fonts\arialbd.ttf'))
c=canvas.Canvas(str(out/'architecture-infimatch-v1.pdf'),pagesize=(W,H))
c.setTitle('InfiMatch - Architecture technique - 21 septembre 2026')
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
ink='#182B43'; muted='#526478';blue='#2361A2';teal='#147D72';amber='#B57818';gray='#748297'
def rect(x,y,w,h,fill,stroke=None,r=14,dash=False):
 c.setFillColor(fill);c.setStrokeColor(stroke or fill);c.setLineWidth(2);c.setDash([8,6] if dash else [])
 c.roundRect(x,H-y-h,w,h,r,stroke=bool(stroke),fill=1);c.setDash([])
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke or fill}" stroke-width="2"'+(' stroke-dasharray="8 6"' if dash else '')+'/>')
def text(x,y,s,size=20,bold=False,color=ink,anchor='start'):
 c.setFont('Arial-Bold' if bold else 'Arial',size);c.setFillColor(color)
 if anchor=='middle':c.drawCentredString(x,H-y,s)
 else:c.drawString(x,H-y,s)
 svg.append(f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{escape(s)}</text>')
def arrow(points,dash=False,both=False,color=gray):
 c.setStrokeColor(color);c.setLineWidth(2.6);c.setDash([8,6] if dash else [])
 path=c.beginPath();path.moveTo(points[0][0],H-points[0][1])
 for x,y in points[1:]:path.lineTo(x,H-y)
 c.drawPath(path);c.setDash([])
 svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="2.6"'+(' stroke-dasharray="8 6"' if dash else '')+'/>')
 for a,b in [(points[-2],points[-1])]+([(points[1],points[0])] if both else []):
  dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);ux,uy=dx/length,dy/length
  pts=[b,(b[0]-12*ux+5*uy,b[1]-12*uy-5*ux),(b[0]-12*ux-5*uy,b[1]-12*uy+5*ux)]
  p=c.beginPath();p.moveTo(pts[0][0],H-pts[0][1])
  for x,y in pts[1:]:p.lineTo(x,H-y)
  p.close();c.setFillColor(color);c.drawPath(p,fill=1,stroke=0)
  svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in pts)+f'" fill="{color}"/>')
def card(x,y,w,h,title,lines,kind='blue'):
 styles={'blue':('#F0F6FC',blue),'teal':('#EFF9F6',teal),'amber':('#FFF8EB',amber),'gray':('#F5F7FA',gray)}
 fill,border=styles[kind];rect(x,y,w,h,fill,border,dash=kind=='amber')
 text(x+22,y+37,title,25,True,border)
 for i,line in enumerate(lines):text(x+22,y+72+29*i,line,19)
rect(0,0,W,H,'#FFFFFF',r=0)
text(60,65,'InfiMatch — architecture technique',38,True)
text(60,108,'21 septembre 2026 • flux logiques • déploiement distinct du site, de l’API et de l’administration',21,color=muted)
card(60,180,440,150,'Site public — Vercel',['React / TypeScript / Vite','Candidats, établissements, agences'])
card(580,180,440,150,'Administration — Vercel',['React / build séparé','Rôles, sessions admin et MFA'])
card(1100,180,440,150,'Configuration privée',['Vault local → variables serveur','Aucun secret dans le bundle VITE'],'gray')
arrow([(280,330),(280,410),(580,410),(580,465)])
arrow([(800,330),(800,465)])
text(80,393,'HTTPS / sessions / CSRF',19,color=muted)
card(500,465,600,245,'API NestJS / Node 24 — Vercel',['Validation, autorisations et transactions','Matching PostGIS, candidatures, affectations','PDF, notifications, outbox et reçus métier','Tentative de dispatch après écritures éligibles'])
card(60,475,360,220,'Sources publiques',['RPPS : Annuaire Santé','Offres : France Travail / JobsPipe','FINESS : import par CLI'],'teal')
arrow([(500,560),(420,560)],both=True,color=teal)
card(1180,475,360,220,'n8n Cloud',['Webhooks métier authentifiés','Reprise toutes les 4 heures','Imports et maintenance séparés'],'blue')
arrow([(1100,560),(1180,560)],both=True)
card(60,825,460,200,'Supabase / PostgreSQL',['PostGIS, profils, missions, sessions','Outbox, reçus et audit','document_blob : contenu chiffré'],'teal')
card(570,825,440,200,'MongoDB Atlas',['Explications du matching','Données minimisées et versionnées','Stockage distinct des décisions SQL'],'teal')
card(1060,825,480,200,'Notifications externes',['Discord : canal facultatif','SMTP2GO : emails transactionnels','Réception réelle à prouver séparément'],'teal')
arrow([(660,710),(660,760),(290,760),(290,825)])
arrow([(800,710),(800,825)])
arrow([(940,710),(940,760),(1300,760),(1300,825)])
card(60,1100,690,145,'Exploitation locale',['CLI : migrations, imports et sauvegardes','Rôle de migration distinct du rôle applicatif'],'gray')
card(800,1100,740,145,'Frontières et limites',['API : contrôle des droits avant accès aux documents','Noc ode : orchestration ; règles métier et PDF dans l’API'.replace('Noc ode','Nocode')],'gray')
text(60,1300,'Vue documentaire : ne vaut ni recette complète de production ni preuve de restauration ou de conformité.',20,color=muted)
c.save();svg.append('</svg>')
(out/'architecture-infimatch-v1.svg').write_text('\n'.join(svg),encoding='utf-8')
doc=pdfium.PdfDocument(str(out/'architecture-infimatch-v1.pdf'));page=doc[0]
page.render(scale=1).to_pil().save(out/'architecture-infimatch-v1.png')
page.close();doc.close()
print('Architecture: SVG, PDF et PNG générés')
