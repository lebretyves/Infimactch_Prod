"""Monthly revenue and operating-surplus comparison, with fixed-cost caveat."""
import csv
import json
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.ticker import FuncFormatter
from pypdf import PdfReader, PdfWriter

R=Path(__file__).resolve().parent
v=json.loads((R.parents[1]/'rendu/2026-09-23/resultats-couts.json').read_text(encoding='utf8'))
C=v['monthly_total']; E=20; colors=['#234BFF','#D98226','#009D8F']
names=['19 €/mission','299 €/établissement','149 €/établissement + 9 €/mission']
def revenues(n,e):return [19*n,299*e if n<=30*e else None,149*e+9*n]
def fmt(n):return f'{n:,.2f}'.replace(',',' ').replace('.',',')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
euros=FuncFormatter(lambda n,pos:f'{n:,.0f} €'.replace(',',' '))
def setup(ax,title,ylabel):
    ax.set_facecolor('#F4F6F8');ax.set_title(title,loc='left',fontsize=13,fontweight='bold',pad=12,color='#15283F')
    ax.grid(axis='y',color='#DCE3EA',zorder=0);ax.yaxis.set_major_formatter(euros)
    ax.set_xlabel('Missions validées par mois');ax.set_ylabel(ylabel)
def note(fig):
    fig.text(.065,.045,'Résultat estimé = CA HT − budget de fonctionnement ; ce n’est pas un bénéfice net. Coûts commerciaux, paiement, impôts et dépassements exclus.\nForfait : plafond de 30 validations PAR établissement, non mutualisable. À 20 abonnés : au plus 600 au total, selon leur répartition.\nScénario à coûts constants dans les quotas ; même clientèle et même demande supposées pour comparer les prix. Source : modèle InfiMatch du 24/09/2026.',fontsize=9,color='#536679')

fig,axes=plt.subplots(2,2,figsize=(16,11),facecolor='#F4F6F8')
fig.suptitle('InfiMatch — quelle formule rapporte le plus ?',x=.065,ha='left',fontsize=24,fontweight='bold',color='#15283F')
fig.text(.065,.925,'20 établissements payants • budget de fonctionnement : 5 265,30 €/mois • propositions commerciales à tester',fontsize=12,color='#536679')
ns=range(0,1001)
for j,(name,color) in enumerate(zip(names,colors)):
    xx=[n for n in ns if revenues(n,E)[j] is not None];yy=[revenues(n,E)[j] for n in xx]
    axes[0,0].plot(xx,yy,color=color,lw=2.7,label=name)
    axes[0,1].plot(xx,[y-C for y in yy],color=color,lw=2.7,label=name)
    ux=[n for n in xx if n>=100];axes[1,1].plot(ux,[(revenues(n,E)[j]-C)/n for n in ux],color=color,lw=2.7,label=name)
setup(axes[0,0],'1. Chiffre d’affaires et coût mensuels','Montant mensuel')
axes[0,0].axhline(C,color='#15283F',ls='--',lw=1.8,label='Coût : 5 265,30 €/mois');axes[0,0].legend(loc='upper left',fontsize=9)
setup(axes[0,1],'2. Résultat mensuel après coût de fonctionnement','Résultat mensuel')
axes[0,1].axhline(0,color='#15283F',lw=1.2)
axes[0,1].axvspan(0,314,color=colors[1],alpha=.07);axes[0,1].axvspan(315,1000,color=colors[0],alpha=.05)
axes[0,1].axvline(5980/19,color='#536679',ls=':',lw=1.2)
axes[0,1].text(.03,.90,'Meilleur résultat :\nforfait jusqu’à 314 missions',transform=axes[0,1].transAxes,fontsize=10,color='#9D581A')
axes[0,1].text(.54,.13,'19 €/mission dès 315 missions',transform=axes[0,1].transAxes,fontsize=10,color=colors[0],fontweight='bold')
axes[0,1].scatter([278,254],[19*278-C,2980+9*254-C],c=[colors[0],colors[2]],s=35,zorder=5)
setup(axes[1,0],'3. Résultat mensuel pour quatre volumes','Résultat mensuel')
samples=[100,300,500,1000];width=.23
for j,color in enumerate(colors):
    for i,n in enumerate(samples):
        rev=revenues(n,E)[j]
        if rev is None:
            axes[1,0].text(i+(j-1)*width,150,'Hors\nforfait',ha='center',va='bottom',fontsize=8,color='#536679')
        else:
            value=rev-C;axes[1,0].bar(i+(j-1)*width,value,width=.21,color=color,zorder=3)
            axes[1,0].annotate(f'{value:+,.0f}'.replace(',',' '),(i+(j-1)*width,value),xytext=(0,4 if value>=0 else -12),textcoords='offset points',ha='center',fontsize=8)
axes[1,0].set_ylim(-4500,15500);axes[1,0].set_xticks(range(4),[str(n) for n in samples]);axes[1,0].axhline(0,color='#15283F',lw=1)
setup(axes[1,1],'4. Résultat moyen alloué par mission','Résultat par validation')
axes[1,1].axhline(0,color='#15283F',lw=1);axes[1,1].set_xlim(100,1000)
axes[1,1].text(.50,.08,'À 500 missions :\n19 €/mission : +8,47 €/mission\nForfait : +1,43 €/mission\nMixte : +4,43 €/mission',transform=axes[1,1].transAxes,fontsize=10,color='#15283F',bbox={'facecolor':'white','edgecolor':'#DCE3EA','boxstyle':'round,pad=.6'})
note(fig);fig.subplots_adjust(left=.065,right=.98,top=.87,bottom=.16,hspace=.38,wspace=.23)
fig.savefig(R/'comparaison-ca-couts-benefice.png',dpi=160,facecolor=fig.get_facecolor())
with PdfPages(R/'comparaison-commerciale.pdf') as pdf:
    pdf.savefig(fig);plt.close(fig)
    fig,axs=plt.subplots(1,3,figsize=(16,7.5),facecolor='#F4F6F8',sharey=True)
    fig.suptitle('Le nombre d’établissements change le choix gagnant',x=.065,ha='left',fontsize=22,fontweight='bold',color='#15283F')
    for ax,e in zip(axs,[10,20,40]):
        setup(ax,f'{e} établissements payants','Résultat mensuel')
        for j,(color,name) in enumerate(zip(colors,names)):
            xx=[n for n in ns if revenues(n,e)[j] is not None]
            ax.plot(xx,[revenues(n,e)[j]-C for n in xx],color=color,lw=2.5,label=name)
        ax.axhline(0,color='#15283F',lw=1);threshold=math.floor(299*e/19)+1
        ax.axvline(threshold,color='#536679',ls=':')
        ax.text(.04,.93,f'19 €/mission gagne dès\n{threshold} validations/mois',transform=ax.transAxes,color='#15283F',fontsize=10)
    axs[1].legend(loc='lower right',fontsize=8)
    fig.text(.065,.12,'Comparaison à clientèle constante, pas une prévision de ventes. À dix établissements et faible volume, la meilleure offre peut rester déficitaire.\nLe mixte ne maximise jamais le résultat à clientèle et volume identiques dans ces propositions ; il peut néanmoins être plus facile à vendre.\nMême budget supposé pour 10, 20 et 40 clients : le support supplémentaire doit être mesuré avant de retenir ce scénario.',fontsize=10,color='#536679')
    fig.subplots_adjust(left=.065,right=.98,top=.83,bottom=.27,wspace=.13)
    fig.savefig(R/'comparaison-sensibilite-clients.png',dpi=160,facecolor=fig.get_facecolor());pdf.savefig(fig);plt.close(fig)

writer=PdfWriter()
for filename in ['comparaison-commerciale.pdf','rentabilite-trois-propositions.pdf']:
    for page in PdfReader(R/filename).pages:writer.add_page(page)
with (R/'DOSSIER_RENTABILITE_COMPLET.pdf').open('wb') as f:writer.write(f)
with (R/'comparaison-ca-resultat.csv').open('w',encoding='utf8',newline='') as f:
    wr=csv.writer(f,delimiter=';');wr.writerow(['etablissements','missions','formule','CA_HT','cout_mensuel','resultat_mensuel','resultat_par_mission','taux_resultat_sur_CA_pct','meilleure_formule'])
    for e in [10,20,40]:
        for n in [0,50,100,200,250,254,278,298,300,314,315,500,600,750,1000]:
            revs=revenues(n,e);best=max(r for r in revs if r is not None)
            for j,rev in enumerate(revs):
                wr.writerow([e,n,names[j],round(rev,2) if rev is not None else '',round(C,2),round(rev-C,2) if rev is not None else '',round((rev-C)/n,4) if rev is not None and n else '',round((rev-C)/rev*100,4) if rev else '',rev==best])
for e in range(1,101):
    for n in range(0,1001):
        revs=revenues(n,e)
        assert revs[2]<=max(r for r in revs[:2] if r is not None)
assert revenues(314,20)[1]>revenues(314,20)[0]
assert revenues(315,20)[0]>revenues(315,20)[1]
assert len(PdfReader(R/'DOSSIER_RENTABILITE_COMPLET.pdf').pages)==6
print('PASS: graphs, 6-page dossier, comparative CSV and dominance checks for 100 client counts × 1,001 volumes')

# Include the salary and monthly/annual explanation pages in every full rebuild.
import subprocess, sys
subprocess.run([sys.executable, str(R / "generate-monthly-annual.py")], check=True)
