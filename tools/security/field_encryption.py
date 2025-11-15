"""Field-level encryption utilities for PII protection."""
from cryptography.fernet import Fernet
import os
import base64
from typing import Optional


class FieldEncryption:
    """
    Symmetric encryption for sensitive database fields.
    Uses Fernet (AES-128-CBC + HMAC for authenticity).
    
    Usage:
        encryptor = FieldEncryption()
        encrypted = encryptor.encrypt("user@example.com")
        original = encryptor.decrypt(encrypted)
    """
    
    def __init__(self, key: Optional[str] = None):
        """
        Initialize with encryption key from environment or parameter.
        
        Args:
            key: Base64-encoded Fernet key (32 bytes). If None, reads from
                 FIELD_ENCRYPTION_KEY environment variable.
        """
        if key is None:
            key = os.environ.get('FIELD_ENCRYPTION_KEY')
        if not key:
            raise ValueError(
                "FIELD_ENCRYPTION_KEY environment variable required. "
                "Generate with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        self.cipher = Fernet(key.encode() if isinstance(key, str) else key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded ciphertext
        """
        if not plaintext:
            return ""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt a ciphertext string.
        
        Args:
            ciphertext: Base64-encoded ciphertext from encrypt()
            
        Returns:
            Original plaintext
            
        Raises:
            cryptography.fernet.InvalidToken: If ciphertext is tampered or wrong key
        """
        if not ciphertext:
            return ""
        return self.cipher.decrypt(ciphertext.encode()).decode()


def generate_key() -> str:
    """Generate a new Fernet encryption key."""
    return Fernet.generate_key().decode()


if __name__ == "__main__":
    # CLI tool for key generation
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "generate":
        print("Generated encryption key (store in secrets manager):")
        print(generate_key())
    else:
        print("Usage: python field_encryption.py generate")
