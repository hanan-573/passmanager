# file_handler.py
import json
import csv
import io
import os
import tempfile
import pandas as pd


# ---------------- EXPORT ----------------

def export_csv(entries: list) -> bytes:
    if not entries:
        entries = [{"title": "", "username": "", "password": "", "url": "", "notes": ""}]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["title", "username", "password", "url", "notes"])
    writer.writeheader()
    for e in entries:
        writer.writerow({k: e.get(k, "") for k in writer.fieldnames})
    return buf.getvalue().encode("utf-8")


def export_json(entries: list) -> bytes:
    return json.dumps(entries, indent=2).encode("utf-8")


def export_xls(entries: list) -> bytes:
    df = pd.DataFrame(entries or [{"title": "", "username": "", "password": "", "url": "", "notes": ""}])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="xlwt") as writer:
        df.to_excel(writer, index=False, sheet_name="Passwords")
    return buf.getvalue()


def export_xlsx(entries: list) -> bytes:
    df = pd.DataFrame(entries or [{"title": "", "username": "", "password": "", "url": "", "notes": ""}])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Passwords")
    return buf.getvalue()


def export_mdb(entries: list) -> bytes:
    """MDB export (Access ODBC driver zaroori hai)."""
    import pyodbc
    tmp = tempfile.NamedTemporaryFile(suffix=".mdb", delete=False)
    tmp.close()
    conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={tmp.name};"
    conn = pyodbc.connect(conn_str, autocommit=True)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE Passwords (
            title TEXT, username TEXT, password TEXT, url TEXT, notes TEXT
        )
    """)
    for e in entries:
        cur.execute(
            "INSERT INTO Passwords VALUES (?,?,?,?,?)",
            e.get("title", ""), e.get("username", ""),
            e.get("password", ""), e.get("url", ""), e.get("notes", "")
        )
    conn.commit()
    conn.close()
    with open(tmp.name, "rb") as f:
        data = f.read()
    os.unlink(tmp.name)
    return data


# ---------------- IMPORT ----------------

def import_csv(content: bytes) -> list:
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    return [_normalize(r) for r in reader]


def import_json(content: bytes) -> list:
    data = json.loads(content.decode("utf-8", errors="ignore"))
    if isinstance(data, dict):
        data = data.get("entries", [data])
    return [_normalize(r) for r in data]


def import_xls(content: bytes, xls=True) -> list:
    buf = io.BytesIO(content)
    engine = "xlrd" if xls else "openpyxl"
    df = pd.read_excel(buf, engine=engine)
    return [_normalize(r) for r in df.to_dict(orient="records")]


def import_mdb(content: bytes) -> list:
    import pyodbc
    tmp = tempfile.NamedTemporaryFile(suffix=".mdb", delete=False)
    tmp.write(content)
    tmp.close()
    try:
        conn_str = f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={tmp.name};"
        conn = pyodbc.connect(conn_str)
        cur = conn.cursor()
        rows = cur.execute("SELECT * FROM Passwords").fetchall()
        cols = [c[0] for c in cur.description]
        conn.close()
        return [_normalize(dict(zip(cols, r))) for r in rows]
    finally:
        os.unlink(tmp.name)


def _normalize(row: dict) -> dict:
    """Different column names ko standard format mein convert karta hai."""
    keys = {k.lower().strip(): v for k, v in row.items() if k}

    def pick(*names):
        for n in names:
            if n in keys and keys[n] not in (None, ""):
                return str(keys[n])
        return ""

    return {
        "title":    pick("title", "name", "site", "website", "account"),
        "username": pick("username", "user", "login", "email", "user name"),
        "password": pick("password", "pass", "pwd"),
        "url":      pick("url", "link", "website url", "uri"),
        "notes":    pick("notes", "note", "comment", "description"),
    }