from pathlib import Path
from html import escape
import math
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdfium2 as pdfium

out=Path('docs/diagrams');out.mkdir(exist_ok=True)
W,H=1600,1360
pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:\Windows\Fonts\arialbd.ttf'))
c=canvas.Canvas(str(out/'architecture-infimatch-v1.pdf'),pagesize=(W,H))
c.setTitle('InfiMatch - Architecture backend V1 - 15 septembre 2026')
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
text(60,65,'InfiMatch — architecture backend V1',38,True)
text(60,102,'État au 15 septembre 2026 • flux principaux • monolithe modulaire NestJS',21,color=muted)
rect(1080,42,20,20,'#F0F6FC',blue,r=4);text(1110,60,'Implémenté / testé en local',18)
rect(1080,80,20,20,'#FFF8EB',amber,r=4,dash=True);text(1110,98,'Prévu / à raccorder',18)
card(60,180,400,110,'Navigateur',['Infirmier, établissement ou agence'],'gray')
card(560,180,480,110,'Reverse proxy HTTPS',['Origine unique — déploiement à valider'],'amber')
card(1120,180,420,110,'Frontend Next.js prévu',['Pages, cartes, espace utilisateur'],'amber')
arrow([(460,235),(560,235)],True);text(510,215,'HTTPS',17,anchor='middle')
arrow([(1040,235),(1120,235)],True);text(1080,215,'Pages',17,anchor='middle')
arrow([(800,290),(800,410)],True);text(822,355,'/api/v1',20,color=muted)
card(560,410,480,245,'API NestJS / TypeScript',[
 'Sessions, permissions et contrôles',
 'Interne : admissibilité puis score',
 'Externe : comparaison partielle',
 'Règles métier, notifications et PDF',
 'Service actuel : HTTP local'
])
card(60,410,400,110,'Annuaire Santé — API FHIR',['Recherche exacte du numéro RPPS'],'teal')
arrow([(560,468),(460,468)],both=True,color=teal)
text(510,446,'HTTPS',16,anchor='middle',color=teal)
card(1120,410,420,170,'n8n local — 3 workflows',[
 'Notification de correspondance',
 'Relance des missions non pourvues',
 'Confirmation de mission'
])
arrow([(1120,487),(1040,487)],color=blue)
text(1080,464,'Actions',16,anchor='middle',color=blue)
card(1120,650,420,115,'Worker asynchrone',[
 'Lit les événements dans PostgreSQL',
 'Appelle n8n et gère les reprises'
])
arrow([(1330,650),(1330,580)],color=blue);text(1350,622,'Webhooks',18,color=blue)
card(1120,815,420,85,'n8n Cloud',['Instance fournie : non raccordée'],'amber')
card(60,610,400,135,'Données publiques',[
 'France Travail : annonces via API',
 'FINESS : fichier officiel téléchargé'
],'teal')
card(60,795,400,105,'CLI TypeScript / Commander',[
 'Nettoyage, classement et import'
])
arrow([(260,745),(260,795)],color=teal)
arrow([(160,900),(160,1030)],color=teal)
text(177,956,'Import contrôlé',18,color=teal)
arrow([(800,655),(800,980),(260,980),(260,1030)],color=blue)
arrow([(800,980),(800,1030)],color=blue)
arrow([(800,980),(1330,980),(1330,1030)],color=blue)
text(824,803,'Données métier',19,color=blue)
text(824,832,'Explications internes',19,color=blue)
text(824,861,'Documents chiffrés',19,color=blue)
card(60,1030,400,180,'PostgreSQL + PostGIS',[
 'mission • external_offer • profile',
 'Candidatures, affectations, FINESS',
 'Sessions, notifications et audit',
 'Outbox : événements à traiter'
],'teal')
card(560,1030,480,180,'MongoDB',[
 'Explications du matching interne',
 'Résultats et règles versionnés',
 'Expiration des traces',
 'Comparaison externe : non stockée'
],'teal')
card(1120,1030,420,180,'Fichiers privés',[
 'Justificatifs et confirmations PDF',
 'Chiffrement AES-256-GCM',
 'Téléchargement via API autorisée'
],'teal')
rect(60,1240,1480,78,'#F5F7FA',r=10)
text(80,1271,'Score interne : pondération expérimentale 45 / 25 / 20 / 10, à réévaluer. Annonces externes : aucun score global.',19)
text(80,1300,'Les bases, fichiers et l’éditeur n8n restent privés. Le contrôle réglementaire des deux ans en ETP reste à implémenter.',18,color=muted)
text(60,1342,'n8n orchestre ; le backend décide selon les règles. L’agence valide humainement l’affectation.',17,color=muted)
c.save();svg.append('</svg>')
(out/'architecture-infimatch-v1.svg').write_text('\n'.join(svg),encoding='utf-8')
doc=pdfium.PdfDocument(str(out/'architecture-infimatch-v1.pdf'));page=doc[0];page.render(scale=1.4).to_pil().save(out/'architecture-infimatch-v1.png')
page.close();doc.close()
print('SVG, PDF and PNG created')
