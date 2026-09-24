"""Three financial explanation pages; amounts come from the shared cost model."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.ticker import FuncFormatter
from pypdf import PdfReader, PdfWriter

R=Path(__file__).resolve().parent
D=R.parents[1]/'rendu/2026-09-23'
v=json.loads((D/'resultats-couts.json').read_text(encoding='utf8'))
m=json.loads((D/'couts-production.json').read_text(encoding='utf8'))
cost=v['monthly_total'];gross=m['salary_gross_year']/12
employer=v['maintenance_employer_monthly'];contributions=employer-gross
revenues=[500*19,20*299,20*149+500*9]
results=[r-cost for r in revenues]
names=['19 €/mission','Forfait 299 €','Mixte 149 € + 9 €']
colors=['#234BFF','#D98226','#009D8F']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
def money(n):return f'{n:,.2f} €'.replace(',',' ').replace('.',',')
def figure(title,subtitle):
    fig=plt.figure(figsize=(16,10),facecolor='#F4F6F8')
    fig.suptitle(title,x=.07,ha='left',fontsize=24,fontweight='bold',color='#15283F')
    fig.text(.07,.905,subtitle,fontsize=12,color='#536679')
    return fig
def axis(fig,rect,title):
    ax=fig.add_axes(rect,facecolor='#F4F6F8')
    ax.set_title(title,loc='left',fontweight='bold',fontsize=15,pad=16,color='#15283F')
    ax.grid(axis='y',color='#DCE3EA',zorder=0)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda n,p:f'{n:,.0f} €'.replace(',',' ')))
    return ax
def footer(fig,text,page):
    fig.text(.07,.07,text,fontsize=10,color='#536679',linespacing=1.6)
    fig.text(.94,.035,f'{page} / 9',ha='right',color='#536679',fontsize=10)

with PdfPages(R/'EXPLICATIONS_MOIS_ANNEE_SALAIRE.pdf') as pdf:
    fig=figure('La personne qui gère InfiMatch : quel salaire ?',
               'Une personne à temps plein • hypothèse salariale de 41 000 € brut/an • déjà incluse dans les coûts')
    ax=axis(fig,[.08,.36,.42,.43],'Coût employeur mensuel')
    ax.bar([0],[gross],color='#234BFF',width=.5,zorder=3)
    ax.bar([0],[contributions],bottom=[gross],color='#00A493',width=.5,zorder=3)
    ax.text(0,gross/2,'Salaire brut\n'+money(gross),ha='center',va='center',fontsize=17,fontweight='bold',color='white')
    ax.text(0,gross+contributions/2,'Charges employeur\nsupposées (+42 %)\n'+money(contributions),ha='center',va='center',fontsize=13,fontweight='bold',color='white')
    ax.text(0,employer+180,money(employer)+'/mois',ha='center',fontsize=17,fontweight='bold',color='#15283F')
    ax.set_ylim(0,6000);ax.set_xticks([0],['Une personne']);ax.set_xlim(-.6,.6)
    rows=[['Salaire brut',money(gross),money(gross*12)],['Charges employeur (+42 %)',money(contributions),money(contributions*12)],['Coût employeur total',money(employer),money(employer*12)],['Autres coûts du projet',money(cost-employer),money((cost-employer)*12)],['Coût total InfiMatch',money(cost),money(cost*12)]]
    ta=fig.add_axes([.55,.36,.39,.4]);ta.axis('off')
    table=ta.table(cellText=rows,colLabels=['Poste','Par mois','Par an'],cellLoc='left',colWidths=[.46,.27,.27],bbox=[0,0,1,1]);table.auto_set_font_size(False);table.set_fontsize(10)
    for (row,col),cell in table.get_celld().items():
        cell.set_edgecolor('#DCE3EA')
        if row==0:cell.set_facecolor('#15283F');cell.get_text().set_color('white');cell.get_text().set_weight('bold')
    fig.text(.08,.25,'Le salaire est déjà déduit du résultat présenté : il ne faut pas le retirer une deuxième fois.',fontsize=15,fontweight='bold',color='#15283F')
    footer(fig,'41 000 € brut/an : référence APEC Chef de projet digital, utilisée comme hypothèse de budget, pas salaire DevOps constaté.\nCharges employeur +42 % : hypothèse à confirmer selon le contrat ; salaire net non calculé. Aucun salarié effectivement recruté par cette étude.\nSource : modèle InfiMatch du 24/09/2026 et apec.fr/tous-nos-metiers/commercial-marketing/chef-de-projet-digital.html',7)
    fig.savefig(R/'explication-salaire.png',dpi=150);pdf.savefig(fig);plt.close(fig)

    fig=figure('Du chiffre d’affaires au résultat : le salaire est déduit',
               'Exemple mensuel : 500 validations à 19 € = 9 500 € HT de chiffre d’affaires')
    ax=axis(fig,[.08,.33,.85,.47],'Décomposition mensuelle du résultat estimé')
    other=cost-employer
    heights=[9500,employer,other,9500-cost]
    bottoms=[0,9500-employer,9500-cost,0]
    barcolors=['#234BFF','#DC8739','#DBB05D','#009D8F']
    ax.bar(range(4),heights,bottom=bottoms,color=barcolors,width=.6,zorder=3)
    labels=[money(9500),'−'+money(employer),'−'+money(other),money(9500-cost)]
    for i,(height,bottom,label) in enumerate(zip(heights,bottoms,labels)):
        ax.text(i,bottom+height+230,label,ha='center',fontsize=15,fontweight='bold',color='#15283F')
    ax.set_xticks(range(4),['Chiffre d’affaires','Personne à temps plein\ncoût employeur','Autres coûts\nservices, matériel, réserve','Résultat après\nbudget de fonctionnement'])
    ax.set_ylim(0,11000)
    ax.plot([.3,.7],[9500,9500],ls=':',color='#536679')
    ax.plot([1.3,1.7],[9500-employer,9500-employer],ls=':',color='#536679')
    ax.plot([2.3,2.7],[9500-cost,9500-cost],ls=':',color='#536679')
    fig.text(.08,.22,'9 500,00 € − 4 851,67 € − 413,64 € ≈ 4 234,70 € par mois',fontsize=20,fontweight='bold',color='#15283F')
    footer(fig,'Valeurs calculées avant arrondi : l’addition des montants affichés peut différer d’un centime.\nLe résultat n’est pas un bénéfice net : frais commerciaux, frais de paiement, impôts, impayés et dépassements restent hors du budget.\nLes 12 800,98 € de réalisation initiale ne sont pas déduits ici ; une récupération sur 36 mois réduirait le résultat de 355,58 €/mois.',8)
    fig.savefig(R/'explication-ca-resultat.png',dpi=150);pdf.savefig(fig);plt.close(fig)

    fig=figure('Par mois ou par an ? Les trois offres sur la même base',
               'Hypothèse constante : 20 établissements et 500 validations chaque mois, soit 6 000 validations/an')
    for index,(factor,rect,title) in enumerate([(1,[.08,.40,.39,.39],'Chaque mois'),(12,[.55,.40,.39,.39],'Sur douze mois identiques')]):
        ax=axis(fig,rect,title)
        for j,color in enumerate(colors):
            ax.bar(j-.16,revenues[j]*factor,width=.3,color=color,alpha=.3,zorder=3)
            ax.bar(j+.16,results[j]*factor,width=.3,color=color,zorder=3)
            ax.text(j+.16,results[j]*factor+factor*170,money(results[j]*factor),ha='center',fontsize=10,fontweight='bold',color='#15283F')
        ax.axhline(cost*factor,color='#15283F',ls='--',label='Coût total : '+money(cost*factor))
        ax.set_xticks(range(3),['À la mission','Forfait','Mixte']);ax.set_ylim(0,11500*factor);ax.legend(loc='upper left',fontsize=9)
    fig.text(.08,.31,'Barres claires : chiffre d’affaires HT. Barres pleines : résultat après coût de fonctionnement.',fontsize=12,color='#536679')
    fig.text(.08,.23,'À 19 €/mission : +4 234,70 €/mois → +50 816,37 €/an',fontsize=20,fontweight='bold',color='#15283F')
    footer(fig,'Projection annuelle = douze mois au même volume et aux mêmes prix : ce n’est pas une prévision de ventes acquises.\nForfait applicable si chacun des vingt établissements reste dans ses trente validations mensuelles incluses.\nCoûts supposés constants dans les quotas ; résultats avant frais exclus et fiscalité. Totaux annuels calculés avant arrondi mensuel.',9)
    fig.savefig(R/'explication-mois-annee.png',dpi=150);pdf.savefig(fig);plt.close(fig)

writer=PdfWriter()
for filename in ['comparaison-commerciale.pdf','rentabilite-trois-propositions.pdf','EXPLICATIONS_MOIS_ANNEE_SALAIRE.pdf']:
    for page in PdfReader(R/filename).pages:writer.add_page(page)
with (R/'DOSSIER_RENTABILITE_COMPLET.pdf').open('wb') as f:writer.write(f)
assert len(PdfReader(R/'DOSSIER_RENTABILITE_COMPLET.pdf').pages)==9
assert round(gross*12,2)==41000
assert round(employer*12,2)==58220
assert round(results[0]*12,2)==50816.37
print('PASS: 3 added graph pages; complete PDF has 9 pages; salary and annual results reconciled')
