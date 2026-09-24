from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader,PdfWriter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/rendu/2026-09-24';OUT.mkdir(parents=True,exist_ok=True)
BLUE='#1466e0';NAVY='#102d48';TEAL='#20b8b4'
def diagram(name,labels,caption):
 fig,ax=plt.subplots(figsize=(12,4),dpi=180);fig.patch.set_facecolor('#f1f6fc');ax.set_facecolor('#f1f6fc');ax.set_xlim(0,12);ax.set_ylim(0,4);ax.axis('off')
 for i,(title,detail) in enumerate(labels):
  x=.25+i*3
  ax.add_patch(FancyBboxPatch((x,1.35),2.5,1.9,boxstyle='round,pad=0.1,rounding_size=0.14',facecolor='white',edgecolor='#d6e3f1',linewidth=1.4))
  ax.text(x+.18,2.9,str(i+1).zfill(2),color=TEAL,fontsize=12,weight='bold');ax.text(x+.18,2.5,title,color=NAVY,fontsize=11,weight='bold');ax.text(x+.18,2.07,detail,color='#50657b',fontsize=9,va='top',linespacing=1.7)
  if i<3:ax.annotate('',xy=(x+2.95,2.3),xytext=(x+2.62,2.3),arrowprops={'arrowstyle':'->','color':BLUE,'lw':2})
 ax.text(.25,.58,caption,color=NAVY,fontsize=10)
 fig.savefig(OUT/(name+'.png'),bbox_inches='tight');fig.savefig(OUT/(name+'.svg'),bbox_inches='tight');plt.close(fig)
diagram('schema-n8n',[('Toutes les 4 h','Déclenchement n8n\nHeure Europe/Paris'),('Mission ouverte','Ancienneté > 24 h\n3 rappels maximum'),('Mission confirmée','Seuils J-1 / H-2\nH-2 non garanti'),('Distribution','Application / Discord\nEmails SMTP2GO')],'Des lots bornés, des contrôles avant envoi et une clé unique empêchent les doublons.')
diagram('schema-mail',[('Événement métier','Confirmation / annulation\nRelance / avant mission'),('File transactionnelle','Destinataire individuel\nÉchéance et déduplication'),('SMTP2GO','Acceptation de l’envoi\nIdentifiant fournisseur'),('Webhook sécurisé','Livré / rejeté / spam\nJournal dans InfiMatch')],'Accepté ne signifie pas livré. Livré au serveur ne signifie pas lu par la personne.')
diagram('schema-discord',[('Notification créée','Mission et organisation\nDestinataires autorisés'),('Destination choisie','Salon privé configuré\nSinon DM du membre'),('Contrôles','Compte actif / appartenance\nÉvénement activé'),('Message privé','Dates lisibles et statut\nLien vers la mission')],'Le repli en message privé concerne les rappels. Aucune diffusion à des comptes sans lien avec la mission.')
W,H=842,595
c=canvas.Canvas(str(OUT/'InfiMatch_Dossier_Notifications.pdf'),pagesize=(W,H));c.setTitle('InfiMatch — Notifications, emails et automatisations')
style=ParagraphStyle('body',fontName='Helvetica',fontSize=13,leading=20,textColor=HexColor(NAVY))
def text(txt,x,y,width=735,size=13):
 st=ParagraphStyle('p',parent=style,fontSize=size,leading=size*1.5);p=Paragraph(txt,st);_,h=p.wrap(width,500);p.drawOn(c,x,y-h);return y-h
page=0
def start(title,sub):
 global page
 page+=1;c.setFillColor(HexColor('#f5f8fd'));c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(HexColor(TEAL));c.roundRect(42,529,14,42,3,fill=1,stroke=0);c.roundRect(28,543,42,14,3,fill=1,stroke=0)
 c.setFillColor(HexColor(BLUE));c.rect(49,543,21,14,fill=1,stroke=0)
 c.setFillColor(HexColor(NAVY));c.setFont('Helvetica-Bold',22);c.drawString(84,541,'InfiMatch')
 c.drawImage(str(ROOT/'docs/rendu/2026-09-23/assets/epitech-noir.png'),684,529,width=118,height=40,preserveAspectRatio=True,mask='auto')
 text(title,42,484,size=29);text(sub,42,431,size=12)
 c.setStrokeColor(HexColor('#d8e2ed'));c.line(42,43,800,43);c.setFont('Helvetica',9);c.setFillColor(HexColor('#50657b'));c.drawString(42,26,'DOSSIER TECHNIQUE • 24 SEPTEMBRE 2026');c.drawRightString(800,26,f'{page:02d}')
def end():c.showPage()
start('Des rappels utiles, au bon destinataire','Évolution préparée et testée localement — activation en production à vérifier séparément.')
y=367
for heading,body in [('Mission non pourvue','Agence et établissement : agir sur les candidatures après 24 h. Trois relances maximum, espacées d’au moins 24 h.'),('Prise de poste','Infirmier affecté et responsables concernés : contrôle des seuils J-1 et H-2 toutes les 4 h. Le passage peut manquer la fenêtre H-2 : ce rappel n’est pas garanti. Une affectation annulée ou une mission commencée bloque l’envoi.'),('Canaux et confidentialité','Notification dans l’application, email individuel et Discord selon les destinations activées. Aucun rappel H-2 sur une mission dont les horaires ne sont pas précisés.')]:
 y=text('<b>'+heading+'</b>',42,y,size=17)-6;y=text(body,42,y)-24
end()
start('01 — Le nouveau scénario n8n','Un export JSON importable, sans secret ni identifiant de credential.')
c.drawImage(str(OUT/'schema-n8n.png'),35,165,width=772,height=257,mask='auto')
text('Cadence retenue pour préserver le quota : toutes les 4 heures, soit 180 exécutions pour 30 jours, hors autres workflows et reprises. Délai nominal après le seuil : jusqu’à 4 h. La fenêtre H-2 peut être manquée ; aucun rappel après le début de mission.',42,139,size=12)
end()
start('02 — De l’email au suivi de livraison','La même file sécurisée sert aux confirmations, annulations et nouveaux rappels.')
c.drawImage(str(OUT/'schema-mail.png'),35,165,width=772,height=257,mask='auto')
text('Constat du 24/09 : 10 emails acceptés, aucun retour enregistré dans l’application ; l’interface SMTP2GO affiche 14 retours de webhook en échec. Il faut rétablir leur traitement avant de déclarer la livraison vérifiée.',42,139,size=12)
end()
start('03 — Réutiliser les messages privés Discord','Les agences et établissements peuvent recevoir les rappels dans le canal privé déjà associé.')
c.drawImage(str(OUT/'schema-discord.png'),35,165,width=772,height=257,mask='auto')
text('Le salon d’organisation reste prioritaire pour un événement configuré. En son absence, le rappel utilise le DM du membre actif, si cet événement y est activé. Un retrait d’organisation ou une désactivation annule les envois encore en attente.',42,139,size=12)
end()
start('04 — Exemples de messages','Illustrations fictives : les vraies dates et le titre proviennent de la mission.')
y=373
for title,body in [('MISSION À POURVOIR — AGENCE / ÉTABLISSEMENT','Cette mission est toujours ouverte. Consultez les candidatures et le suivi du recrutement.<br/><b>Mission :</b> IDE — service de médecine<br/><b>Début :</b> 28 septembre 2026 à 08 h, Europe/Paris<br/><b>Action :</b> Consulter la mission'),('RAPPEL AVANT MISSION — INFIRMIER AFFECTÉ','Votre affectation est confirmée. Consultez les horaires, le lieu et les consignes avant votre prise de poste.<br/><b>Mission :</b> IDE — service de médecine<br/><b>Début :</b> 28 septembre 2026 à 08 h, Europe/Paris<br/><b>Action :</b> Consulter la mission')]:
 y=text('<b>'+title+'</b>',42,y,size=16)-8;y=text(body,42,y,size=12)-27
end()
start('05 — Validation et mise en service','Les preuves de tests ne remplacent pas la vérification de la configuration de production.')
y=374
for t in ['<b>661 tests unitaires réussis</b> sur la première passe après modification ; les nouveaux cas sont vérifiés en intégration.', '<b>28 tests d’intégration réussis</b> : emails, retours de livraison, permissions, garde-fous et 4 nouveaux cas sur les rappels.', '<b>À déployer :</b> migration SQL et backend, interface puis nouveau scénario n8n ; associer le credential du service et éviter deux planificateurs concurrents.', '<b>À activer et vérifier :</b> événements des destinations privées concernées, webhook SMTP2GO, premier passage n8n et suivi de livraison réel.', '<b>Aucun secret dans les exports :</b> identifiants n8n à associer dans l’interface ; secret de webhook conservé dans Vault.']:
 y=text(t,42,y,size=13)-22
end();c.save()
base=ROOT/'docs/rendu/2026-09-23/InfiMatch_Soutenance_Pro_2026-09-23.pdf'
if base.exists():
 writer=PdfWriter();writer.append(str(base));writer.append(str(OUT/'InfiMatch_Dossier_Notifications.pdf'));writer.write(str(OUT/'InfiMatch_Soutenance_avec_notifications.pdf'))
print(OUT)
