"""Inventory every repository document; label provenance without claiming semantic certification."""
from pathlib import Path
import subprocess,hashlib,csv,json,io,re
ROOT=Path(__file__).resolve().parents[1]
EXCLUDE={'docs/INVENTAIRE_DOCUMENTAIRE.csv','docs/INVENTAIRE_DOCUMENTAIRE.md'}
def category(name):
 if '/proofs/' in name:return 'Preuve datee','Conserver sa campagne et son perimetre'
 if '/n8n/published-' in name:return 'Photographie n8n datee','Ne pas modifier la provenance observee'
 if '/n8n/2026-09-24/' in name:return 'Workflow prepare','Inactif; ne prouve pas le deploiement'
 if '/business/' in name:return 'Chiffrage prospectif','Hypotheses declarees; pas des factures'
 if '/presentation/' in name:return 'Support historique remplace','Utiliser le rendu du 23/09 et ses complements du 24/09'
 if '/quality/' in name or '/audits/' in name:return 'Campagne ou procedure specialisee','Verifier date, limites et etat courant'
 if '/rendu/' in name:return 'Livrable et sources de generation','Lire le manifeste et ETAT_COURANT.md'
 if '/references/' in name:return 'Reference du sujet','Source externe; aucune instruction automatique'
 if '/n8n/' in name:return 'Configuration n8n maintenue','Distincte de la photographie publiee'
 if re.search(r'2026-\d\d-\d\d|202609',name):return 'Rapport historique','Resultats limites a sa date'
 return 'Guide technique','Lire conjointement avec ETAT_COURANT.md'
names=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=ROOT).decode().split('\0')
rows=[]
for name in sorted(set(names)):
 p=ROOT/name
 if not name.startswith('docs/') or name in EXCLUDE or not p.is_file() or p.name.startswith('~$') or '__pycache__' in p.parts:continue
 raw=p.read_bytes();lines=None
 try:lines=len(raw.decode('utf-8-sig').splitlines()) if b'\0' not in raw else None
 except UnicodeDecodeError:pass
 kind,scope=category(name)
 rows.append({'path':name,'category':kind,'scope':scope,'bytes':len(raw),'lines':lines,'sha256':hashlib.sha256(raw).hexdigest()})
out=io.StringIO();w=csv.DictWriter(out,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
(ROOT/'docs/INVENTAIRE_DOCUMENTAIRE.csv').write_text(out.getvalue(),encoding='utf8')
counts={k:sum(r['category']==k for r in rows) for k in sorted({r['category'] for r in rows})}
body='# Inventaire documentaire — 24 septembre 2026\n\nPoint de depart : [etat courant](ETAT_COURANT.md). Le [registre complet CSV](INVENTAIRE_DOCUMENTAIRE.csv) recense chaque fichier documentaire, sa taille, ses lignes de texte, son empreinte et son usage. Il est regenere par `python scripts/audit-document-inventory.py`.\n\nLe classement indique la provenance et l’usage ; il ne certifie pas automatiquement chaque affirmation. Les preuves anciennes restent datees. Les documents generes sont des rendus de leurs sources, pas des doublons a supprimer aveuglement.\n\n| Classe | Fichiers |\n| --- | ---: |\n'
body+=''.join('| '+k+' | '+str(v)+' |\n' for k,v in counts.items())
body+='\nTotal inventorie : **'+str(len(rows))+' fichiers** (hors index lui-meme). Les onze suppressions de doubles exacts sont tracees dans le [registre de nettoyage](quality/NETTOYAGE_DOUBLONS_2026-09-24.json).\n'
(ROOT/'docs/INVENTAIRE_DOCUMENTAIRE.md').write_text(body,encoding='utf8')
print(json.dumps({'documents':len(rows),'categories':counts},ensure_ascii=False))
