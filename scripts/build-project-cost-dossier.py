"""Render the development-cost estimate from the existing canonical model."""
import json
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'annexe/rendu/2026-09-23/couts-production.json').read_text(encoding='utf-8'))
hours=m['people_actual']*m['days']*(m['hours_day']+m['hours_evening'])
gross=hours*m['salary_gross_year']/m['paid_hours_year']
charges=gross*m['employer_loading_assumption']
equipment=m['people_actual']*m['equipment_per_station_ht']/m['equipment_years']/m['working_days_year_assumption']*m['days']
fmt=lambda x:f'{x:,.2f}'.replace(',',' ').replace('.',',')+' EUR'
out=ROOT/'documentation/cout-projet/COUT_REALISATION_INFIMATCH.pdf'
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleBlue',fontName='Helvetica-Bold',fontSize=27,leading=32,textColor=HexColor('#123454'),spaceAfter=16))
styles['BodyText'].leading=16
styles['BodyText'].spaceAfter=10
story=[]
def p(text,style='BodyText'):story.append(Paragraph(text,styles[style]))
def table(rows):
 t=Table(rows,colWidths=[335,160],hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#123454')),('TEXTCOLOR',(0,0),(-1,0),white),('BACKGROUND',(0,1),(-1,-1),HexColor('#eef4f9')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),('ALIGN',(1,0),(1,-1),'RIGHT')]))
 story.append(t);story.append(Spacer(1,18))
def footer(c,d):
 c.setFillColor(HexColor('#123454'));c.setFont('Helvetica',9)
 c.drawString(50,30,'InfiMatch | Estimation de réalisation | 24 septembre 2026')
 c.drawRightString(545,30,str(d.page))
 logo=ROOT/'annexe/rendu/2026-09-23/assets/epitech-noir.png'
 if logo.exists():c.drawImage(str(logo),445,775,width=100,height=28,preserveAspectRatio=True,mask='auto')
p('INFIMATCH / DOSSIER PROJET')
p('Coût de réalisation<br/>de l’application','TitleBlue')
p('Valorisation du travail de l’équipe et du matériel mobilisé pendant les onze jours de réalisation.')
p(fmt(gross+charges+equipment),'TitleBlue')
p('<b>Estimation économique, pas une facture.</b> Le montant comprend le travail valorisé avec une hypothèse de charges employeur et l’amortissement du matériel affecté au projet.')
table([['Composition du coût','Montant'],['Travail au salaire brut de référence',fmt(gross)],['Charges employeur supposées (+42 %)',fmt(charges)],['Quote-part d’amortissement du matériel',fmt(equipment)],['TOTAL ESTIMATIF',fmt(gross+charges+equipment)]])
p('Temps de travail retenu','Heading2')
p(f"{m['people_actual']} personnes × {m['days']} jours × ({m['hours_day']} h en journée + environ {m['hours_evening']} h le soir) = <b>environ {hours} h-personnes</b>, soit 99 h par personne. La capacité initiale était de 385 h (5 personnes × 11 jours × 7 h).")
p('Ces heures sont reconstituées d’après la déclaration de l’équipe. Le détail quotidien et par fonctionnalité reste à documenter.')
story.append(PageBreak())
p('Hypothèses et traçabilité','TitleBlue')
p('Référence salariale','Heading2')
p('41 000 EUR brut/an / 1 820 heures payées/an = 22,53 EUR brut/h. Les calculs utilisent le taux non arrondi. La référence APEC Chef de projet digital était citée dans le dossier préparé le 24 septembre 2026. Le taux de charges de 42 % est une hypothèse de budget.')
p('<link href="https://www.apec.fr/tous-nos-metiers/commercial-marketing/chef-de-projet-digital.html" color="#1466e0">Source salariale : fiche métier APEC</link>')
p('Matériel et amortissement','Heading2')
p('Quatre postes à 2 000 EUR HT : achat théorique de 8 000 EUR. Amortissement sur trois ans et 220 jours d’utilisation professionnelle par an : 8 000 / 3 / 220 × 11 = <b>133,33 EUR</b> affectés au projet. Les soirées ne doublent pas les jours d’amortissement.')
p('L’achat intégral et l’amortissement ne sont pas additionnés. Si tous les postes devaient être achetés, la trésorerie théorique travail chargé + achat serait de <b>20 667,65 EUR</b>, hors frais inconnus.')
p('Ce qui reste à établir','Heading2')
p('Ce montant ne constitue pas un coût complet constaté : majorations éventuelles des heures supplémentaires, abonnements et licences réellement payés pendant le projet, locaux, énergie et frais généraux restent non établis. Le fonctionnement mensuel futur et la maintenance sont chiffrés séparément.')
p('Sources de calcul dans le Git','Heading2')
p('annexe/rendu/2026-09-23/ : couts-production.json, calcul-couts.py, resultats-couts.json, COUTS_PRODUCTION.xlsx et 09_COUTS_PRODUCTION.md. Le dossier documentation/cout-projet/README.md regroupe leurs liens. Ce PDF réutilise le modèle existant ; aucun nouveau prix fournisseur n’a été supposé.')
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=80,bottomMargin=55,title='InfiMatch - Coût de réalisation du projet',author='InfiMatch').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
