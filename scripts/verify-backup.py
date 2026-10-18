"""Verify a logical backup in a temporary SQLite database, without touching production."""
import argparse
import json
import pathlib
import sqlite3
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('backup', type=pathlib.Path)
parser.add_argument('--sql-output', type=pathlib.Path, help='Optional SQL for restoration into a NEW empty database only')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
if args.backup.stat().st_size > 20 * 1024 * 1024:
    raise SystemExit('Backup exceeds the supported verification limit')
document = json.loads(args.backup.read_text())
expected = ['catalogue_documents', 'inventory', 'orders', 'order_lines', 'order_events']
if document.get('format') != 1 or set(document.get('tables', {})) != set(expected):
    raise SystemExit('Unsupported or incomplete backup')
with tempfile.TemporaryDirectory() as folder:
    connection = sqlite3.connect(pathlib.Path(folder) / 'restore.db')
    connection.execute('PRAGMA foreign_keys=ON')
    for migration in sorted((root / 'drizzle').glob('*.sql')):
        connection.executescript(migration.read_text())
    for table in expected:
        columns = {row[1] for row in connection.execute(f'PRAGMA table_info({table})')}
        rows = document['tables'][table]
        if not isinstance(rows, list) or len(rows) > 10000:
            raise SystemExit('Invalid table')
        for row in rows:
            if not isinstance(row, dict) or not row or not set(row).issubset(columns):
                raise SystemExit('Invalid columns')
            names = list(row)
            quoted = ','.join('"' + name + '"' for name in names)
            placeholders = ','.join('?' for _ in names)
            connection.execute(f'INSERT INTO {table} ({quoted}) VALUES ({placeholders})', [row[name] for name in names])
    connection.commit()
    if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or connection.execute('PRAGMA foreign_key_check').fetchall():
        raise SystemExit('Backup failed integrity verification')
    if args.sql_output:
        # Refuse accidental replacement, and make confidential output owner-only.
        with args.sql_output.open('x') as target:
            args.sql_output.chmod(0o600)
            target.write('\n'.join(connection.iterdump()).replace('BEGIN TRANSACTION;', 'BEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;', 1) + '\n')
    print('Backup verified: schema, records, references and integrity are valid.')
