# app.py
from flask import Flask, request, jsonify, render_template, send_file, send_from_directory
import io
import uuid
import os
from datetime import datetime
import crypto_utils as cu
import file_handler as fh

app = Flask(__name__, template_folder=".", static_folder=".")

SESSION = {"key": None}


@app.route("/style.css")
def serve_css():
    return send_from_directory(".", "style.css")


@app.route("/app.js")
def serve_js():
    return send_from_directory(".", "app.js")


@app.route("/")
def home():
    return render_template("index.html")


@app.post("/api/unlock")
def unlock():
    pwd = request.json.get("password", "")
    if not pwd:
        return jsonify({"ok": False, "error": "Password required"}), 400
    key = cu.derive_key(pwd)
    if not cu.verify_password(key):
        return jsonify({"ok": False, "error": "Wrong master password"}), 401
    SESSION["key"] = key
    return jsonify({"ok": True})


@app.post("/api/lock")
def lock():
    SESSION["key"] = None
    return jsonify({"ok": True})


def _require_key():
    if not SESSION["key"]:
        return None, (jsonify({"ok": False, "error": "Locked"}), 401)
    return SESSION["key"], None


@app.post("/api/change-password")
def change_password():
    """Naya master password set karta hai (forgot password flow)."""
    data = request.json or {}
    new_pwd = data.get("new_password", "").strip()

    if len(new_pwd) < 4:
        return jsonify({"ok": False, "error": "Password must be at least 4 characters"}), 400

    try:
        # Purani vault aur salt files delete karein
        for fname in (cu.VAULT_FILE, cu.SALT_FILE):
            if os.path.exists(fname):
                os.remove(fname)

        # Naya empty vault naye password ke sath
        key = cu.derive_key(new_pwd)
        cu.save_vault({}, key)
        SESSION["key"] = key

        return jsonify({"ok": True})
    except Exception as ex:
        return jsonify({"ok": False, "error": str(ex)}), 500


@app.get("/api/entries")
def list_entries():
    key, err = _require_key()
    if err:
        return err
    vault = cu.load_vault(key)
    entries = []
    for eid, item in vault.items():
        item = dict(item)
        item["id"] = eid
        entries.append(item)
    entries.sort(key=lambda x: x.get("title", "").lower())
    return jsonify({"ok": True, "entries": entries})


@app.post("/api/entries")
def add_entry():
    key, err = _require_key()
    if err:
        return err
    data = request.json
    vault = cu.load_vault(key)
    eid = str(uuid.uuid4())
    data["created_at"] = datetime.utcnow().isoformat()
    data["updated_at"] = data["created_at"]
    vault[eid] = data
    cu.save_vault(vault, key)
    data["id"] = eid
    return jsonify({"ok": True, "entry": data})


@app.put("/api/entries/<eid>")
def update_entry(eid):
    key, err = _require_key()
    if err:
        return err
    data = request.json
    vault = cu.load_vault(key)
    if eid not in vault:
        return jsonify({"ok": False, "error": "Not found"}), 404
    data["created_at"] = vault[eid].get("created_at", datetime.utcnow().isoformat())
    data["updated_at"] = datetime.utcnow().isoformat()
    vault[eid] = data
    cu.save_vault(vault, key)
    data["id"] = eid
    return jsonify({"ok": True, "entry": data})


@app.delete("/api/entries/<eid>")
def delete_entry(eid):
    key, err = _require_key()
    if err:
        return err
    vault = cu.load_vault(key)
    vault.pop(eid, None)
    cu.save_vault(vault, key)
    return jsonify({"ok": True})


@app.get("/api/export/<fmt>")
def export(fmt):
    key, err = _require_key()
    if err:
        return err
    vault = cu.load_vault(key)
    entries = [dict(v) for v in vault.values()]
    fmt = fmt.lower()

    if fmt == "csv":
        data = fh.export_csv(entries)
        mime, name = "text/csv", "passwords.csv"
    elif fmt == "json":
        data = fh.export_json(entries)
        mime, name = "application/json", "passwords.json"
    elif fmt == "xls":
        data = fh.export_xls(entries)
        mime, name = "application/vnd.ms-excel", "passwords.xls"
    elif fmt == "xlsx":
        data = fh.export_xlsx(entries)
        mime, name = ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      "passwords.xlsx")
    elif fmt == "mdb":
        try:
            data = fh.export_mdb(entries)
        except Exception as ex:
            return jsonify({"ok": False, "error": str(ex)}), 500
        mime, name = "application/octet-stream", "passwords.mdb"
    else:
        return jsonify({"ok": False, "error": "Unsupported format"}), 400

    return send_file(io.BytesIO(data), mimetype=mime,
                     as_attachment=True, download_name=name)


@app.post("/api/import")
def import_file():
    key, err = _require_key()
    if err:
        return err
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "No file"}), 400

    f = request.files["file"]
    ext = os.path.splitext(f.filename)[1].lower()
    content = f.read()

    try:
        if ext == ".csv":
            rows = fh.import_csv(content)
        elif ext == ".json":
            rows = fh.import_json(content)
        elif ext == ".xls":
            rows = fh.import_xls(content, xls=True)
        elif ext == ".xlsx":
            rows = fh.import_xls(content, xls=False)
        elif ext in (".mdb", ".accdb"):
            rows = fh.import_mdb(content)
        else:
            return jsonify({"ok": False, "error": f"Unsupported: {ext}"}), 400
    except Exception as ex:
        return jsonify({"ok": False, "error": str(ex)}), 500

    vault = cu.load_vault(key)
    added = 0
    for r in rows:
        if not (r.get("title") or r.get("username") or r.get("password")):
            continue
        eid = str(uuid.uuid4())
        r["created_at"] = datetime.utcnow().isoformat()
        r["updated_at"] = r["created_at"]
        vault[eid] = r
        added += 1
    cu.save_vault(vault, key)
    return jsonify({"ok": True, "added": added, "total_rows": len(rows)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)