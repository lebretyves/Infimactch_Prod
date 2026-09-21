"""Render the public Vault guide; never read secret values or local audit logs."""
from pathlib import Path
import runpy,sys
sys.argv=[str(Path(__file__).resolve().parents[1]/'render-documentation.py'),'--vault-only']
runpy.run_path(sys.argv[0],run_name='__main__')
