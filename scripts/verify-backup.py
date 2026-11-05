"""Legacy entry point. Verification uses Node.js >=22.18, without Python SQLite."""
import pathlib
import subprocess
import sys

if __name__ == '__main__':
    script = pathlib.Path(__file__).resolve().with_suffix('.mjs')
    try:
        result = subprocess.run(['node', str(script), *sys.argv[1:]], check=False)
        raise SystemExit(result.returncode)
    except FileNotFoundError:
        raise SystemExit('Node.js >=22.18 is required. Run node scripts/verify-backup.mjs --help.')
