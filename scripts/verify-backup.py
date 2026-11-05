"""Verify and export a backup into a NEW isolated database, never production."""
import argparse
import hashlib
import json
import pathlib
import re
import sqlite3
import tempfile

BASE = ['catalogue_documents', 'inventory', 'orders', 'order_lines', 'order_events']
OPTIONAL = ['order_notifications', 'owner_notifications', 'order_costs']
ROOT = pathlib.Path(__file__).resolve().parent.parent


def verify(args):
    raw = args.backup.read_bytes()
    if len(raw) > 20 * 1024 * 1024:
        raise ValueError('Backup exceeds the supported verification limit')
    document = json.loads(raw)
    tables = document.get('tables', {})
    if document.get('format') != 1 or not set(BASE).issubset(tables) or set(tables) - set(BASE + OPTIONAL):
        raise ValueError('Unsupported or incomplete backup')
    manifest = json.loads(args.manifest.read_text()) if args.manifest else None
    if args.files_root and not manifest:
        raise ValueError('--files-root requires --manifest')
    if manifest:
        if manifest.get('sha256') != hashlib.sha256(raw).hexdigest() or manifest.get('bytes') != len(raw):
            raise ValueError('Database checksum or length does not match the manifest')
        if manifest.get('rows') != {name: len(rows) for name, rows in tables.items()}:
            raise ValueError('Manifest table counts do not match the database')
        if manifest.get('files') != len(manifest.get('objects', [])):
            raise ValueError('Incomplete file manifest')
    with tempfile.TemporaryDirectory() as folder:
        connection = sqlite3.connect(pathlib.Path(folder) / 'restore.db')
        connection.execute('PRAGMA foreign_keys=ON')
        for migration in sorted((ROOT / 'drizzle').glob('*.sql')):
            connection.executescript(migration.read_text())
        # Loading opted-in orders must not create new notification events.
        triggers = connection.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'").fetchall()
        for name, _ in triggers:
            connection.execute('DROP TRIGGER "' + name.replace('"', '""') + '"')
        for table in BASE + OPTIONAL:
            rows = tables.get(table, [])
            columns = {row[1] for row in connection.execute(f'PRAGMA table_info({table})')}
            if not isinstance(rows, list) or len(rows) > 10000:
                raise ValueError('Invalid table')
            for row in rows:
                if not isinstance(row, dict) or not row or not set(row).issubset(columns):
                    raise ValueError('Invalid columns')
                names = list(row)
                quoted = ','.join('"' + name + '"' for name in names)
                placeholders = ','.join('?' for _ in names)
                connection.execute(f'INSERT INTO {table} ({quoted}) VALUES ({placeholders})', [row[name] for name in names])
            actual = connection.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
            if actual != len(rows):
                raise ValueError('Restored record count mismatch')
        for _, sql in triggers:
            connection.execute(sql)
        connection.commit()
        if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or connection.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Backup failed integrity verification')
        checked_files = 0
        if args.files_root:
            root = args.files_root.resolve()
            for item in manifest['objects']:
                key = item.get('backupKey', '')
                if not isinstance(key, str) or not key or '\\' in key or pathlib.PurePosixPath(key).is_absolute():
                    raise ValueError('Invalid backup file path')
                path = (root / key).resolve()
                if not path.is_relative_to(root) or not path.is_file():
                    raise ValueError('A backup file is missing or outside the selected directory')
                data = path.read_bytes()
                if len(data) != item.get('size'):
                    raise ValueError('A backup file has an invalid length')
                expected = item.get('sha256')
                if not isinstance(expected, str) or not re.fullmatch('[a-f0-9]{64}', expected):
                    raise ValueError('Full file verification requires a recent manifest with SHA-256 checksums')
                if hashlib.sha256(data).hexdigest() != expected:
                    raise ValueError('A backup file checksum is invalid')
                checked_files += 1
        if args.sql_output:
            # Preserve snapshot data during verification. In an exported restore,
            # queued messages require human review to prevent historical resends.
            for table in OPTIONAL[:2]:
                if table in tables:
                    connection.execute(f"UPDATE {table} SET state='uncertain',error_code='RESTORE_REVIEW' WHERE state IN ('pending','sending')")
            connection.commit()
            statements = list(connection.iterdump())
            ddl = [line for line in statements if line.startswith('CREATE TABLE')]
            data = []
            for table in BASE + OPTIONAL:
                data.extend(line for line in statements if line.startswith(f'INSERT INTO "{table}"'))
            sequence = [line for line in statements if line.startswith('DELETE FROM "sqlite_sequence"') or line.startswith('INSERT INTO "sqlite_sequence"')]
            later = [line for line in statements if line.startswith('CREATE INDEX') or line.startswith('CREATE UNIQUE INDEX') or line.startswith('CREATE TRIGGER')]
            sql = '\n'.join(['BEGIN TRANSACTION;', 'PRAGMA defer_foreign_keys=ON;', *ddl, *data, *sequence, *later, 'COMMIT;'])
            with args.sql_output.open('x') as target:
                args.sql_output.chmod(0o600)
                target.write('-- Import into a NEW empty database only. Review WhatsApp outboxes before enabling sends.\n' + sql + '\n')
        print(f'Backup verified: schema, {sum(len(v) for v in tables.values())} records, references and integrity are valid. Files verified: {checked_files}.')
        if not args.files_root:
            print('File contents were not checked: provide --manifest and --files-root for full verification.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backup', type=pathlib.Path)
    parser.add_argument('--manifest', type=pathlib.Path)
    parser.add_argument('--files-root', type=pathlib.Path, help='Local directory containing the downloaded R2 backup tree')
    parser.add_argument('--sql-output', type=pathlib.Path, help='SQL for restoration into a NEW empty database only')
    try:
        verify(parser.parse_args())
    except (ValueError, KeyError, TypeError, OSError, sqlite3.Error) as error:
        raise SystemExit(str(error))
