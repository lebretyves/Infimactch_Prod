"""Professional, vector-based 15-minute InfiMatch presentation. PDF only."""
from pathlib import Path
import json,math
from html import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from PIL import Image
R=Path(__file__).resolve().parent
ROOT=R.parents[2]
W,H=1280,720
NAVY='#101E32';INK='#15283F';BLUE='#234BFF';TEAL='#00B5A5';PALE='#F4F6F8';MUTED='#536679';LINE='#DCE3EA';WHITE='#FFFFFF'
for n,f in [('Body','segoeui.ttf'),('Bold','segoeuib.ttf'),('Light','segoeuil.ttf')]:
 pdfmetrics.registerFont(TTFont(n,str(Path('C:/Windows/Fonts')/f)))
c=canvas.Canvas(str(R/'InfiMatch_Soutenance_Pro_2026-09-23.pdf'),pagesize=(W,H))
c.setTitle('InfiMatch — Soutenance Epitech');c.setAuthor('Équipe InfiMatch');c.setSubject('POC • 15 minutes • 24 septembre 2026')
checks=[]
def box(x,y,w,h,color,r=0,stroke=None):
 c.setFillColor(color);c.setStrokeColor(stroke or color)
 if r:c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
 else:c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))
def line(x1,y1,x2,y2,color=LINE,width=1):
 c.setStrokeColor(color);c.setLineWidth(width);c.line(x1,H-y1,x2,H-y2)
def circle(x,y,r,fill,stroke=None):
 c.setFillColor(fill);c.setStrokeColor(stroke or fill);c.circle(x,H-y,r,fill=1,stroke=bool(stroke))
def txt(s,x,y,w,h,size=22,color=INK,bold=False,align=0,leading=1.22):
 style=ParagraphStyle('p',fontName='Bold' if bold else 'Body',fontSize=size,leading=size*leading,textColor=color,alignment=align)
 p=Paragraph(s,style);_,height=p.wrap(w,h)
 if height>h+0.1:raise ValueError('Text overflow '+s[:70]+' '+str(height)+'/'+str(h))
 if x<0 or y<0 or x+w>W+1 or y+h>H+1:raise ValueError('Outside slide '+s[:30])
 p.drawOn(c,x,H-y-height);checks.append({'text':s[:50],'font':size,'height':round(height,1),'available':h})
def image(path,x,y,w,h,cover=False):
 im=Image.open(path).convert('RGBA')
 iw,ih=im.size
 if cover:
  factor=max(w/iw,h/ih);dw,dh=iw*factor,ih*factor
  c.saveState();p=c.beginPath();p.rect(x,H-y-h,w,h);c.clipPath(p,stroke=0,fill=0)
  c.drawImage(ImageReader(im),x+(w-dw)/2,H-y-h+(h-dh)/2,dw,dh,mask='auto');c.restoreState()
 else:
  factor=min(w/iw,h/ih);dw,dh=iw*factor,ih*factor
  c.drawImage(ImageReader(im),x,H-y-dh,dw,dh,mask='auto')
def logos(dark=False):
 # Vector reconstruction of the two rounded bars in frontend/src/ui/Logo.tsx.
 x,y,size=58,29,42
 scale=size/40
 for color,clip in [('#41bcc8',False),('#005bd8',True)]:
  c.saveState()
  if clip:
   path=c.beginPath();path.rect(x+20*scale,H-y-size,20*scale,size);c.clipPath(path,stroke=0,fill=0)
  box(x+13.6*scale,y+3.6*scale,12.8*scale,32.8*scale,color,2.4*scale)
  box(x+3.6*scale,y+13.6*scale,32.8*scale,12.8*scale,color,2.4*scale)
  c.restoreState()
 txt('Infi',111,32,100,40,25,WHITE if dark else INK,True)
 txt('Match',111+pdfmetrics.stringWidth('Infi','Bold',25),32,145,40,25,'#8ACEF2' if dark else '#005bd8',True)
 image(R/'assets'/('epitech-blanc.png' if dark else 'epitech-noir.png'),1040,34,178,46)
def base(n,section,dark=False,source=None):
 box(0,0,W,H,NAVY if dark else PALE);logos(dark)
 line(60,665,1220,665,'#304158' if dark else LINE)
 txt('POC • SOUTENANCE • 24 SEPTEMBRE 2026',60,679,450,18,10,'#A7B7C8' if dark else MUTED)
 txt(section,580,679,470,18,10,'#A7B7C8' if dark else MUTED,align=2)
 txt(f'{n:02d} / 13',1128,675,92,25,13,TEAL,True,align=2)
 if source:txt(source,60,636,1158,21,10,'#B2C2D3' if dark else MUTED)
def heading(kicker,title,subtitle=None,dark=False):
 txt(kicker.upper(),60,110,1100,25,12,TEAL if dark else BLUE,True)
 txt(title,60,145,1160,110,46,WHITE if dark else INK,True,leading=1.08)
 if subtitle:txt(subtitle,62,256,1145,46,19,'#BDCDDF' if dark else MUTED)
def card(x,y,w,h,title,body,number=None,accent=BLUE):
 box(x,y,w,h,WHITE,14)
 if number:txt(number,x+24,y+23,w-48,46,30,accent,True)
 yy=y+(82 if number else 24)
 txt(title,x+24,yy,w-48,65,24,INK,True)
 txt(body,x+24,yy+77,w-48,h-(yy-y)-88,18,MUTED)
def arrow(x1,y,x2,color=BLUE):
 line(x1,y,x2,y,color,2)
 p=c.beginPath();p.moveTo(x2-7,H-y-5);p.lineTo(x2,H-y);p.lineTo(x2-7,H-y+5)
 c.setStrokeColor(color);c.drawPath(p)
def finish():c.showPage()
# 01 — cover
base(1,'LE BESOIN',True)
box(746,120,474,480,'#20364C',18)
photo=ROOT/'frontend/public/images/coordination-960-aba91bc947a8.webp'
image(photo,758,132,450,456,True)
box(782,489,402,76,NAVY,10)
txt('3 acteurs. Un parcours partagé.',803,507,358,41,23,WHITE,True)
txt('L’INTÉRIM INFIRMIER, PENSÉ POUR LE SOIN',62,123,650,23,12,TEAL,True)
txt('La bonne mission.<br/>Une décision<br/>claire.',58,175,662,249,66,WHITE,True,leading=1.04)
txt('Relier infirmiers, établissements et agences,<br/>de la recherche à la confirmation d’affectation.',62,458,620,85,24,'#C5D3E1')
box(62,573,205,35,TEAL,17)
txt('DÉMONSTRATION • 15 MIN',76,581,180,19,11,NAVY,True)
finish()
# 02 — market
base(2,'LE SECTEUR',source='Source : DREES, Études et Résultats n° 1319, décembre 2024. Donnée historique, pas un effectif 2026.')
heading('Le secteur','Un besoin de coordination dans la santé.')
box(60,298,466,304,NAVY,16)
txt('599 000',87,323,415,108,83,WHITE,True)
txt('infirmières en emploi en 2021',91,431,390,62,25,'#D5E3F2')
txt('Un repère sectoriel.<br/>Pas une mesure de notre marché accessible.',91,526,385,53,17,'#A7BACF')
for i,(title,body) in enumerate([('Infirmiers','Trouver une mission compatible et suivre sa candidature.'),('Établissements','Exprimer un besoin et connaître son état de couverture.'),('Agences','Coordonner le recrutement et décider de l’affectation.')]):
 y=300+i*103;circle(574,y+25,19,BLUE);txt(str(i+1),561,y+10,27,28,18,WHITE,True,align=1)
 txt(title,612,y,580,33,25,INK,True);txt(body,612,y+42,580,52,19,MUTED)
c.linkURL('https://www.drees.solidarites-sante.gouv.fr/sites/default/files/2024-12/ER1319_0.pdf',(60,62,1110,84),relative=0)
finish()
# 03 — competitors
base(3,'LE POSITIONNEMENT',source='Sources primaires : hublo.com/fr · appelmedical.com · staffsante.fr — consultées le 23/09/2026.')
heading('Le positionnement','Le marché existe. Notre angle doit être validé.')
names=[('Hublo','RH et remplacements','Organisation des équipes et des remplacements.'),('Appel Médical','Recrutement spécialisé','Relation agence, offres et suivi des intérimaires.'),('Staffsanté','Offres et candidatures','Recherche d’emploi, candidatures et alertes.')]
for i,(name,tag,body) in enumerate(names):
 x=60+i*394;box(x,286,372,227,WHITE,12)
 txt(name,x+24,309,325,43,29,INK,True);txt(tag,x+24,366,325,31,16,BLUE,True);txt(body,x+24,415,325,71,19,MUTED)
box(60,535,1160,73,BLUE,12)
txt('Notre hypothèse : un suivi explicite entre trois acteurs, avec un matching expliqué.',84,553,1110,44,23,WHITE,True)
finish()
# 04 — roles
base(4,'LE PARCOURS')
heading('Le produit','Une candidature n’est pas une affectation.','Les responsabilités restent visibles à chaque étape.')
for i,(title,body,no) in enumerate([('Infirmier','Profil et disponibilités.<br/>Recherche et candidature.<br/>Agenda et documents.','01'),('Établissement','Besoin de personnel.<br/>Publication des missions.<br/>Suivi du recrutement.','02'),('Agence','Examen des candidatures.<br/>Sélection et confirmation.<br/>Suivi de l’affectation.','03')]):
 x=60+394*i;card(x,324,372,267,title,body,no)
 if i<2:arrow(x+353,310,x+396,TEAL)
txt('Une décision humaine, des droits distincts et des états conservés.',63,612,1120,26,17,MUTED)
finish()
# 05 — demo
base(5,'DÉMONSTRATION • 3 MINUTES',source='Illustration du parcours : comptes et mission fictifs préparés pour la démonstration, pas une capture de production.')
heading('Démonstration','Du besoin à la confirmation, en trois minutes.')
steps=[('01','Rechercher','Une mission compatible'),('02','Candidater','Un état « en attente »'),('03','Décider','Un recruteur habilité'),('04','Confirmer','Document et calendrier')]
for i,(n,title,body) in enumerate(steps):
 x=60+i*295;circle(x+29,311,26,BLUE if i<2 else TEAL);txt(n,x+10,296,38,30,19,WHITE,True,align=1)
 if i<3:arrow(x+65,311,x+269,LINE)
 txt(title,x,361,273,40,26,INK,True);txt(body,x,413,267,57,19,MUTED)
box(60,511,1160,89,NAVY,13)
txt('Le point à montrer',83,529,260,27,13,TEAL,True)
txt('Le passage de « candidature envoyée » à « affectation confirmée ».',83,559,1100,31,22,WHITE,True)
finish()
# 06 — architecture dark
base(6,'L’ARCHITECTURE',True)
heading('La technique','Chaque composant a une responsabilité.',dark=True)
nodes=[(60,310,260,150,'Interfaces','React / TypeScript<br/>Site et administration'),(440,310,310,150,'API métier','NestJS<br/>Permissions et transactions'),(870,278,350,92,'PostgreSQL / PostGIS','États métier et géographie'),(870,394,350,92,'MongoDB','Explications du matching')]
for x,y,w,h,title,body in nodes:
 box(x,y,w,h,'#20334D',12);txt(title,x+20,y+15,w-40,33,22,WHITE,True);txt(body,x+20,y+53,w-40,h-57,17,'#C0D0E0')
arrow(334,379,425,TEAL);arrow(766,327,856,TEAL);arrow(766,436,856,TEAL)
box(441,512,779,92,'#193D48',12)
txt('n8n : l’orchestration',463,529,510,32,24,WHITE,True)
txt('Les règles métier restent côté API. Les secrets restent hors du dépôt.',463,567,720,29,17,'#BEE8E0')
line(595,465,595,508,TEAL,2)
finish()
# 07 — data
base(7,'LES DONNÉES PUBLIQUES',source='Source : ANS, FINESS — Structures, data.gouv.fr · Licence Ouverte 2.0. Exemple ci-dessous : données synthétiques.')
heading('Les données publiques','FINESS : du fichier brut à un usage concret.')
box(60,294,537,233,NAVY,12);box(681,294,539,233,WHITE,12)
txt('AVANT • EXTRAIT SYNTHÉTIQUE',85,315,487,24,12,TEAL,True)
txt('Identifiant : "010000002"<br/>Nom : "  Établissement FICTIF  "<br/>Coordonnées : chaînes de caractères',85,367,483,128,23,WHITE,leading=1.6)
txt('APRÈS • NORMALISATION RÉELLE',707,315,486,24,12,BLUE,True)
txt('Zéro initial conservé<br/>Texte nettoyé et borné<br/>Coordonnées validées ou absentes',707,367,480,128,23,INK,leading=1.6)
arrow(615,406,663,BLUE)
box(60,551,1160,63,'#E2F3EE',10)
txt('Usage produit : retrouver un établissement à partir du référentiel normalisé.',83,566,1110,40,22,INK,True)
c.linkURL('https://www.data.gouv.fr/datasets/finess-structures-1',(60,62,1110,84),relative=0)
finish()
# 08 — workflows
base(8,'LES AUTOMATISATIONS',source='Neuf exports de versions publiées observées le 23/09/2026. Un export actif ne prouve pas une livraison réussie.')
heading('Le nocode','Des scénarios compréhensibles et traçables.')
for row,(name,labels) in enumerate([('MATCHING',['Mission ouverte','Traitement n8n','Notification']),('CONFIRMATION',['Décision humaine','Événement / n8n','PDF et suivi'])]):
 y=304+row*139
 txt(name,61,y+24,180,40,14,BLUE,True)
 for j,label in enumerate(labels):
  x=256+j*328;box(x,y,290,91,WHITE,12);txt(label,x+18,y+26,254,52,23,INK,True,align=1)
  if j<2:arrow(x+299,y+45,x+319,TEAL)
txt('Reprise toutes les 4 heures • Credentials à réassocier • JSON Cloud et modèles locaux distingués',62,587,1140,44,17,MUTED)
finish()
# 09 — numbers
base(9,'LES PREUVES',True,source='Campagne backend du 23/09/2026 : docs/proofs/discord-notifications-20260923/. Frontend : campagne antérieure.')
heading('La qualité','Des résultats mesurés. Un périmètre précis.',dark=True)
txt('660',57,277,510,144,130,WHITE,True,leading=1)
txt('/ 660 tests unitaires réussis',66,434,493,48,27,'#BBD0E5')
txt('11 intégrations notifications réussies.<br/>Régressions SQL réussies.<br/>Frontend : 81/81, campagne antérieure.',66,513,496,104,21,'#BBD0E5',leading=1.4)
for i,(label,num) in enumerate([('Lignes',95.11),('Branches',89.98),('Fonctions',82.41)]):
 y=292+i*102
 txt(label,654,y,280,36,23,WHITE);txt(f'{num:.2f}'.replace('.',',')+' %',1027,y,189,39,26,TEAL,True,align=2)
 box(654,y+53,566,12,'#2A3D56',6);box(654,y+53,566*num/100,12,TEAL,6)
txt('Couverture unitaire du backend.<br/>Pas une garantie d’absence de bugs.',654,599,552,48,16,'#BBD0E5')
finish()
# 10 — responsible
base(10,'LA QUALITÉ DE SERVICE',source='Contrôles ciblés documentés : aucune certification globale RGAA, RGESN ou sécurité revendiquée.')
heading('Les pratiques','Protéger les données. Réduire le superflu.')
cards=[('Sécurité','Droits par rôle.<br/>Chiffrement et MFA.<br/>Secrets dans Vault.','01'),('Accessibilité','Navigation clavier.<br/>Structure sémantique.<br/>Corrections ciblées.','02'),('Sobriété','Requêtes regroupées.<br/>Scan compact des offres.<br/>Détails chargés à la demande.','03')]
for i,(t,b,n) in enumerate(cards):card(60+394*i,304,372,294,t,b,n,TEAL if i==2 else BLUE)
finish()
# 11 — effort and equipment
base(11,'LA CHARGE ET LE MATÉRIEL',source='Déclaration équipe du 24/09/2026 • APEC 41 kEUR brut/an • Hypothèses : charges +42 %, matériel 2 000 EUR/poste, 3 ans.')
heading('La réalisation','396 heures déclarées. Un coût explicite.')
txt('396 h',60,286,720,107,86,INK,True)
txt('308 h de journée + environ 88 h le soir',65,411,710,42,25,MUTED)
txt('4 personnes × 11 jours × (7 h + 2 h)<br/>Capacité initiale à cinq : 385 h, soit +11 h.<br/>Ventilation par fonctionnalité à compléter.',65,480,704,116,22,INK,leading=1.5)
box(830,286,390,328,NAVY,15)
txt('12 800,98 EUR',852,308,349,64,37,WHITE,True)
txt('Travail valorisé avec charges<br/>+ matériel amorti affecté.<br/><br/>Matériel : 133,33 EUR imputés.<br/>Achat de 4 postes : 8 000 EUR,<br/>sans double comptage.',854,396,343,190,20,'#C0D0E0',leading=1.4)
finish()
# 12 — monthly production budget
base(12,'LE COÛT D’EXPLOITATION',source='Budget prospectif : 09_COUTS_PRODUCTION.md • USD/EUR à parité conventionnelle • Hors dépassements et temps du recruteur.')
heading('L’exploitation','Un salarié à temps plein. Trois volumes.')
box(60,288,525,326,NAVY,15)
txt('5 265,30 EUR/mois',83,310,480,60,38,WHITE,True)
txt('Maintenance : 4 851,67 EUR<br/>Services : 265,07 EUR<br/>Réserve : 53,01 EUR<br/>Matériel amorti : 55,56 EUR<br/>Connexion et énergie : 40 EUR',84,397,477,193,23,'#C0D0E0',leading=1.5)
for i,(volume,price) in enumerate([('100 validations/mois','52,65 EUR'),('500 validations/mois','10,53 EUR'),('1 000 validations/mois','5,27 EUR')]):
 y=290+i*105;box(623,y,597,90,WHITE,12);txt(volume,642,y+17,340,30,20,MUTED);txt(price,979,y+21,222,45,29,BLUE,True,align=2)
txt('Coût moyen alloué par mission validée.<br/>Hypothèses de consommation à mesurer en pilote.',642,608,570,44,16,MUTED)
finish()
# 12 — closing
base(13,'LA SUITE',True)
txt('LA SUITE',62,119,1050,25,12,TEAL,True)
txt('Un POC démontrable.<br/>Un pilote à valider.',58,174,1130,177,66,WHITE,True,leading=1.05)
items=[('01','Documenter','Ventiler les 396 h. Preuve J+2.'),('02','Éprouver','Besoin terrain et modèle B2B.'),('03','Finaliser','Suivi PostGIS et DNS local.')]
for i,(n,t,b) in enumerate(items):
 x=63+393*i;line(x,413,x+351,413,'#354B65',2);txt(n,x,440,67,42,30,TEAL,True)
 txt(t,x,494,348,49,29,WHITE,True);txt(b,x,551,348,58,19,'#B8CADE')
finish()
c.save()
(R/'validation-design-pro.json').write_text(json.dumps({'pages':13,'durationMinutes':15,'textBlocks':len(checks),'overflow':0,'logoSource':'https://newsroom.epitech.eu/','checks':checks},ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS: 13 redesigned PDF pages; all text bounds checked.')
