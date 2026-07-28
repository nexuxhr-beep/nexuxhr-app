# NexuxHR cPanel Authentication Setup (No Firebase / No Blaze)

## 1. Create MySQL database in cPanel
Open **MySQL Databases** and create a database + database user. Assign the user **ALL PRIVILEGES**.

## 2. Import tables
Open **phpMyAdmin**, select the new database, choose **Import**, and upload:

`cpanel-api/schema.sql`

## 3. Configure API
Inside `cpanel-api`, copy:

`config.example.php` → `config.php`

Edit database credentials and replace `CHANGE_TO_EMAIL_PASSWORD` with the NEW password of `noreply@nexuxhr.com`.
Never commit or share `config.php`.

## 4. Upload API
In cPanel File Manager create:

`public_html/api/`

Upload these files from `cpanel-api`:
- `index.php`
- `.htaccess`
- `config.php`

Do not upload `schema.sql` publicly after import.

Test in browser: `https://nexuxhr.com/api/index.php` should return Method not allowed because it expects POST. That confirms PHP is reachable.

## 5. Frontend environment
Create `.env` in project root:

`VITE_AUTH_API_URL=https://nexuxhr.com/api`

For local testing, cPanel API permits `http://localhost:3000` via CORS.

## 6. Run frontend
```bash
npm install
npm run dev
```

## Included authentication
- Signup email OTP
- Password hashing with PHP `password_hash`
- Password login + email OTP
- Hashed OTP storage, 5 attempts, 5-minute expiry
- Secure random server sessions
- Forgot/reset password email link
- Optional invitation code and role assignment
- Logout and session validation endpoint

## Security
Change the SMTP password previously exposed in chat before using this package.
Use HTTPS on nexuxhr.com. Keep `config.php` private.
