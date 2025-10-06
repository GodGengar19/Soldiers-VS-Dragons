import os
import json
import bcrypt
from cryptography.fernet import Fernet

SAVE_DIR = os.path.expanduser("~/.dragons_game/")
KEY_FILE = os.path.join(SAVE_DIR, "key.bin")

def get_encryption_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as f:
            f.write(key)
    else:
        with open(KEY_FILE, 'rb') as f:
            key = f.read()
    return key

def hash_password(password):
    # bcrypt automatically generates a salt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed)

def save_progress(username, password, progress):
    # Hash password on registration
    hashed_pw = hash_password(password)
    data = {
        "username": username,
        "password_hash": hashed_pw.decode(),  # Store hash only
        "progress": progress
    }
    # Encrypt
    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(json.dumps(data).encode())
    with open(os.path.join(SAVE_DIR, f"{username}.sav"), 'wb') as fsave:
        fsave.write(encrypted)

def load_progress(username, password):
    f = Fernet(get_encryption_key())
    file_path = os.path.join(SAVE_DIR, f"{username}.sav")
    if not os.path.exists(file_path):
        raise ValueError("No save file found.")
    with open(file_path, 'rb') as fsave:
        data = json.loads(f.decrypt(fsave.read()).decode())
    if not verify_password(password, data['password_hash'].encode()):
        raise ValueError("Incorrect password.")
    return data['progress']
