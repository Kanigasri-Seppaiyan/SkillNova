"""
utils/create_admin.py — Secure CLI administrative user provisioner.
Usage:
    python -m utils.create_admin --email admin@bitsathy.ac.in
    python -m utils.create_admin --email admin@bitsathy.ac.in --password "MySecretPass123!"
"""
import argparse
import getpass
import sys
import os

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal
from models.user import User, UserRole
from models.audit import AuditLog
from services.auth_service import hash_password
from utils.validate_email import normalize_email, is_allowed_institute_email, ALLOWED_DOMAIN


def create_or_promote_admin(email: str, password: str = None):
    clean_email = normalize_email(email)
    if not clean_email or not is_allowed_institute_email(clean_email):
        print(f"[ERROR] Email must be a valid institutional account ending in @{ALLOWED_DOMAIN}.")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == clean_email).first()

        if user:
            print(f"[INFO] User with email {clean_email} already exists with role: {user.role}.")
            confirm = input("Do you want to promote this user to Administrator? [y/N]: ").strip().lower()
            if confirm != "y":
                print("[ABORTED] Operation cancelled.")
                return

            before_role = str(user.role)
            user.role = UserRole.admin
            user.is_active = True

            # If password provided, update it
            if password:
                user.password_hash = hash_password(password)
                print("[INFO] Password updated.")

            log_entry = AuditLog(
                actor_user_id=user.id,
                action_type="ROLE_PROMOTION_ADMIN",
                target_table="users",
                target_id=user.id,
                before_value={"role": before_role},
                after_value={"role": "admin"},
                reason="CLI create_admin promotion"
            )
            db.add(log_entry)
            db.commit()
            print(f"[SUCCESS] User {clean_email} promoted to Administrator successfully!")
            return

        # New admin creation
        if not password:
            while True:
                p1 = getpass.getpass("Enter Admin Password (min 8 characters): ")
                if len(p1) < 8:
                    print("[ERROR] Password must be at least 8 characters long.")
                    continue
                p2 = getpass.getpass("Confirm Admin Password: ")
                if p1 != p2:
                    print("[ERROR] Passwords do not match. Please try again.")
                    continue
                password = p1
                break

        if len(password) < 8:
            print("[ERROR] Password must be at least 8 characters long.")
            sys.exit(1)

        new_admin = User(
            email=clean_email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        log_entry = AuditLog(
            actor_user_id=new_admin.id,
            action_type="ADMIN_USER_CREATED",
            target_table="users",
            target_id=new_admin.id,
            before_value=None,
            after_value={"email": clean_email, "role": "admin"},
            reason="CLI create_admin initial creation"
        )
        db.add(log_entry)
        db.commit()

        print(f"[SUCCESS] Administrator {clean_email} created successfully with ID #{new_admin.id}!")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="SkillNova Administrator CLI Provisioner")
    parser.add_argument("--email", required=True, help=f"Institutional email (must end in @{ALLOWED_DOMAIN})")
    parser.add_argument("--password", required=False, help="Admin password (optional, prompted securely if omitted)")
    args = parser.parse_args()

    create_or_promote_admin(args.email, args.password)


if __name__ == "__main__":
    main()
