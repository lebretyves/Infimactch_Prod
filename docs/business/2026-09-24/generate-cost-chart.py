"""Export a reproducible cost curve; fixed-budget scenario, not a load forecast."""
import csv
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parents[1] / 'rendu' / '2026-09-23'
v = json.loads((DATA / 'resultats-couts.json').read_text(encoding='utf8'))
monthly = v['monthly_total']
recovery = v['development_employer_plus_equipment'] / 36
volumes = [50, 100, 200, 250, 300, 500, 750, 1000]
with (ROOT / 'cout-par-mission.csv').open('w', encoding='utf8', newline='') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(['validations_mensuelles', 'fonctionnement_eur_par_validation', 'avec_recuperation_poc_36_mois', 'executions_n8n_hypothetiques'])
    for n in volumes:
        writer.writerow([n, round(monthly/n, 4), round((monthly+recovery)/n, 4), round((300+8*n)*1.1)])

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
fig, ax = plt.subplots(figsize=(12, 6.8), facecolor='#f4f6f8')
ax.set_facecolor('#f4f6f8')
x = list(range(50,1001))
ax.plot(x, [monthly/n for n in x], color='#234bff', linewidth=3, label='Fonctionnement : 5 265,30 €/mois')
ax.plot(x, [(monthly+recovery)/n for n in x], color='#00a493', linewidth=2, linestyle='--', label='Avec récupération du POC sur 36 mois : +355,58 €/mois')
for n, offset in [(100,(25,14)), (500,(18,26)), (1000,(-125,28))]:
    y = monthly/n
    ax.scatter(n,y,color='#234bff',s=55,zorder=4)
    ax.annotate(f'{n:,} validations : {y:.2f} €'.replace(',',' ').replace('.',','),(n,y),xytext=offset,textcoords='offset points',fontweight='bold',color='#15283f',arrowprops={'arrowstyle':'-','color':'#536679'})
ax.set(xlim=(50,1030), ylim=(0,118), xlabel='Missions validées par mois — total de la plateforme', ylabel='Coût moyen par mission validée (€)')
ax.yaxis.set_major_formatter(FuncFormatter(lambda value,pos:f'{value:.0f} €'))
ax.grid(axis='y',color='#dce3ea');ax.legend(loc='upper right',frameon=False,fontsize=10)
fig.suptitle('InfiMatch — coût du cycle jusqu’à la validation',x=.09,ha='left',fontsize=21,fontweight='bold',color='#15283f')
fig.text(.09,.915,'Salarié à temps plein, services, matériel amorti et réserve technique inclus.',color='#536679')
fig.text(.09,.055,'Hypothèse de budget constant dans les quotas. Au-delà de 1 000 validations : redimensionnement à chiffrer.\nValidation d’affectation ≠ prestation de soins réalisée. Hors rémunération du soignant et temps du recruteur.\nSource : modèle InfiMatch du 24/09/2026. Récupération du POC : option économique, pas amortissement comptable.',fontsize=9,color='#536679')
fig.subplots_adjust(left=.09,right=.98,bottom=.23,top=.86)
for extension in ['png','svg','pdf']:
    fig.savefig(ROOT/f'cout-par-mission.{extension}',dpi=170,facecolor=fig.get_facecolor())
plt.close(fig)
print('Generated PNG, SVG, PDF and CSV')
