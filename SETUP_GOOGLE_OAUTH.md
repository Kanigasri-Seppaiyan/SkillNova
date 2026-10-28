# Setting Up Google Sign-In for SkillNova

SkillNova uses the official Google Identity Services (GSI) OAuth 2.0 flow for institutional authentication restricted to `@bitsathy.ac.in`. Follow the step-by-step instructions below to configure Google Cloud credentials.

---

## 1. Create or Select a Google Cloud Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project dropdown and select **New Project** (or choose an existing project, e.g., `SkillNova`).
3. Enter Project Name: `SkillNova` and click **Create**.

---

## 2. Configure the OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** > **OAuth consent screen** (or search for *Google Auth Platform*).
2. Choose **User Type**:
   * **Internal**: Recommended if your Google Cloud project is part of the `bitsathy.ac.in` Google Workspace organization (allows any `@bitsathy.ac.in` account to sign in without manual whitelisting).
   * **External**: If you do not have Google Workspace organization admin access. Leave the publishing status as **Testing** and add your `@bitsathy.ac.in` test email accounts under the **Test users** section.
3. Fill in the **App Information**:
   * **App name**: `SkillNova`
   * **User support email**: Your institutional email (e.g. `yourname@bitsathy.ac.in`)
   * **Authorized domains**: Add `bitsathy.ac.in`
   * **Developer contact information**: Your institutional email
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and select:
   * `.../auth/userinfo.email`
   * `.../auth/userinfo.profile`
   * `openid`
6. Click **Update** > **Save and Continue**.
7. If configured as **External**, go to the **Test Users** step and add the `@bitsathy.ac.in` emails you will use for testing. Click **Save and Continue**.

---

## 3. Create OAuth 2.0 Web Client ID

1. In the left sidebar, navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Set **Name** to `SkillNova Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and add:
   * `http://localhost:3000`
   * `http://127.0.0.1:3000`
6. Under **Authorized redirect URIs** (optional for GSI popup flow, required for redirect flow):
   * `http://localhost:3000`
   * `http://127.0.0.1:8000/api/auth/google/callback`
7. Click **Create**.
8. A modal will appear displaying your **Client ID** (e.g., `123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`) and **Client Secret**.
9. Copy your **Client ID**.

---

## 4. Configure SkillNova Environment Variables

### Frontend Configuration (`frontend/.env`)
Open `frontend/.env` (or copy `frontend/.env.example` to `frontend/.env`):
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
```

> **SECURITY NOTE**: Never put `GOOGLE_CLIENT_SECRET` in `frontend/.env` or any frontend code. Client ID is safe for the browser, but Client Secret must remain confidential.

### Backend Configuration (`backend/.env`)
Open `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
ALLOWED_EMAIL_DOMAIN=bitsathy.ac.in
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:5500,http://localhost:5500
```

---

## 5. Restart Development Servers

Vite and FastAPI compile environment variables at startup. After updating `.env` files:

1. **Restart Vite Frontend**:
   ```bash
   cd frontend
   # Stop previous dev server (Ctrl+C)
   npm run dev
   ```
2. **Start / Restart Backend**:
   ```bash
   cd backend
   .\.venv\Scripts\uvicorn main:app --reload --port 8000
   ```

---

## 6. Verification and Testing

1. Open `http://localhost:3000/login` in your browser.
2. The placeholder "Continue with Google" warning will now be replaced with Google's official Sign-In button.
3. Click the Google button to open Google's account selection dialog.
4. **Valid Account Test**:
   * Sign in with a verified account ending in `@bitsathy.ac.in` (e.g., `student@bitsathy.ac.in`).
   * The backend validates the Google token with Google's public keys, verifies `email_verified == true`, confirms the `@bitsathy.ac.in` domain, issues a secure JWT token, and redirects to your dashboard.
5. **Unauthorized Account Test**:
   * Attempt sign-in with a non-institutional account (e.g., personal `@gmail.com` or `@otherdomain.com`).
   * The backend rejects the request with HTTP 403, and the login page displays:
     > *"Access restricted. Please sign in using your verified @bitsathy.ac.in Google account."*
