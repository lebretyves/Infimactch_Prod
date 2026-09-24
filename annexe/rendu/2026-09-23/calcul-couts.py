"""Recompute the disclosed planning scenario, not measured invoices or payroll."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
m = json.loads((ROOT / 'couts-production.json').read_text(encoding='utf8'))
hours = m['people_actual'] * m['days'] * (m['hours_day'] + m['hours_evening'])
gross = hours * m['salary_gross_year'] / m['paid_hours_year']
equipment = m['people_actual'] * m['equipment_per_station_ht'] / m['equipment_years'] / m['working_days_year_assumption'] * m['days']
services = sum(s[1] * (m['usd_to_eur_budget_assumption'] if s[2] == 'USD' else 1) for s in m['services'])
maintenance = m['salary_gross_year'] * (1 + m['employer_loading_assumption']) / 12
monthly_equipment = m['maintenance_stations'] * m['equipment_per_station_ht'] / m['equipment_years'] / 12
total = maintenance + monthly_equipment + services * (1 + m['technical_contingency']) + m['monthly_connectivity_energy_provision']
result = dict(hours=hours, gross_hourly=m['salary_gross_year']/m['paid_hours_year'],
              development_gross=gross, development_equipment=equipment,
              development_gross_plus_equipment=gross+equipment,
              development_employer_plus_equipment=gross*(1+m['employer_loading_assumption'])+equipment,
              services_monthly=services, technical_reserve=services*m['technical_contingency'],
              maintenance_employer_monthly=maintenance, equipment_monthly=monthly_equipment,
              monthly_total=total, yearly_total=total*12,
              scenarios=[dict(validated=n, euros_per_validated=total/n,
                              n8n_runs_budget=(m['n8n_background_per_30days']+n*m['n8n_runs_per_validated_assumption'])*m['n8n_retry_factor']) for n in m['volumes']])
(ROOT/'resultats-couts.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
print(json.dumps(result, ensure_ascii=False, indent=2))
