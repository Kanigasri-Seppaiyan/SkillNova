"""
utils/validate_email.py — Strict institutional email domain validation.
Restricts accounts and authentication to @bitsathy.ac.in.
"""
import re

ALLOWED_DOMAIN = "bitsathy.ac.in"


def normalize_email(raw_email: str) -> str:
    """Strip leading/trailing whitespace and convert email to lowercase."""
    return str(raw_email or "").strip().lower()


def is_allowed_institute_email(raw_email: str) -> bool:
    """
    Validate that an email strictly belongs to @bitsathy.ac.in.
    
    1. Checks basic RFC email shape (valid local part, single @, valid TLD).
    2. Splits strictly on the LAST '@' to prevent multi-@ bypass tricks.
    3. Requires exact match with ALLOWED_DOMAIN.
    """
    email = normalize_email(raw_email)
    if not email:
        return False

    # Basic shape check first (single @ in local context, valid local and domain chars)
    email_shape_regex = r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
    if not re.match(email_shape_regex, email):
        return False

    # Exact domain match on the part AFTER the last "@"
    at_index = email.rfind("@")
    if at_index == -1:
        return False

    domain = email[at_index + 1:]
    return domain == ALLOWED_DOMAIN
