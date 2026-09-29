# crypto_utils.py
import os
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

SALT_FILE = "salt.bin"
VAULT_FILE = "vault.enc"


def _get_or_create_salt():
    if not os.path.exists(SALT_FILE):
        salt = os.urandom(16)
        with open(SALT_FILE, "wb") as f:
            f.write(salt)
    else:
        with open(SALT_FILE, "rb") as f:
            salt = f.read()
    return salt


def derive_key(master_password: str) -> bytes:
    """Master password se encryption key banata hai (PBKDF2)."""
    salt = _get_or_create_salt()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=200_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(master_password.encode()))
    return key


def encrypt_data(data: dict, key: bytes) -> bytes:
    f = Fernet(key)
    raw = json.dumps(data).encode()
    return f.encrypt(raw)


def decrypt_data(token: bytes, key: bytes) -> dict:
    f = Fernet(key)
    raw = f.decrypt(token)
    return json.loads(raw.decode())


def save_vault(data: dict, key: bytes, path=VAULT_FILE):
    with open(path, "wb") as f:
        f.write(encrypt_data(data, key))


def load_vault(key: bytes, path=VAULT_FILE) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "rb") as f:
        token = f.read()
    return decrypt_data(token, key)


def verify_password(key: bytes) -> bool:
    """Check karta hai ke master password sahi hai ya nahi."""
    if not os.path.exists(VAULT_FILE):
        return True
    try:
        load_vault(key)
        return True
    except Exception:
        return False


def change_master_password(old_key: bytes, new_password: str) -> bytes:
    """
    Master password change karta hai BINA data delete kiye.
    1. Purane key se data decrypt
    2. Naye password se naya key
    3. Naye key se data re-encrypt
    """
    data = load_vault(old_key)
    new_key = derive_key(new_password)
    save_vault(data, new_key)
    return new_key