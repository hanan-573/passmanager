# PassManager 🔐

A simple, secure, and self-hosted **Password Manager** built with **Flask + Python (cryptography)** on the backend and **vanilla HTML/CSS/JavaScript** on the frontend. All your passwords are encrypted locally using a master password — nothing is sent to any third-party server.

---

## 📌 Features

- 🔒 **Master Password Protection** — Vault unlock hota hai sirf sahi master password se
- 🛡️ **Strong Encryption** — AES (Fernet) + PBKDF2-HMAC-SHA256 (200,000 iterations)
- ➕ **Add / Edit / Delete** passwords easily
- 🔍 **Live Search** — Title, Username ya URL ke through filter karein
- 👁 **Show / Hide Password** — Har field ke liye toggle eye icon
- 🎲 **Password Generator** — 18-character strong random passwords
- 📋 **One-Click Copy** to clipboard
- 🌗 **Dark / Light Theme** — Preference localStorage mein save hoti hai
- 🔑 **Change Master Password** — Data safe rakhte hue password change
- ♻️ **Forgot Password → Reset Vault** (purana data delete ho jata hai)
- 📤 **Export** — CSV, JSON, XLS, XLSX, MDB (MS Access)
- 📥 **Import** — CSV, JSON, XLS, XLSX, MDB / ACCDB
- 💾 **Local Encrypted Vault** — `vault.enc` + `salt.bin`
- 🎨 **Responsive UI** with toast notifications

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3, Flask |
| Encryption | `cryptography` (Fernet, PBKDF2HMAC) |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Data Handling | pandas, openpyxl, xlrd, xlwt |
| MS Access Support | pyodbc |

---

## 📂 Project Structure
PassManager/
│── app.py              # Flask server + API routes
│── crypto_utils.py     # Encryption / decryption (Fernet + PBKDF2)
│── file_handler.py     # Import / Export (CSV, JSON, XLS, XLSX, MDB)
│── index.html          # Main UI (lock screen + dashboard)
│── style.css           # Styling + dark theme
│── app.js              # Frontend logic
│── requirements.txt    # Python dependencies
│── salt.bin            # (auto-generated) PBKDF2 salt
│── vault.enc           # (auto-generated) Encrypted vault
└── README.md


CREATE A VIRTUAL ENVIRONMENT:- 
python -m venv venv


INSTALL DEPENDENCIES: 
pip install -r requirements.txt

REQUIREMENTS.TXT: 
Flask
cryptography
pandas
openpyxl
xlrd
xlwt
pyodbc


USAGE HOW TO USE: 
python app.py

OPEN BROWSER: 
http://127.0.0.1:5000
