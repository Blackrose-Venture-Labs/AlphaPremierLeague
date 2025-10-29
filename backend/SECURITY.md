# Security Guidelines

## Overview

This document outlines the security practices and configurations for the Blackrose AI Arena backend application.

## Environment Variables

All sensitive information is stored in environment variables and loaded from a `.env` file. **Never commit the `.env` file to version control.**

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@localhost:5432/db` |
| `DOCS_USERNAME` | API documentation username | `admin` |
| `DOCS_PASSWORD` | API documentation password | `SecurePassword123!` |
| `ZERODHA_API_KEY` | Zerodha API key | `your_api_key` |
| `ZERODHA_SECRET` | Zerodha secret key | `your_secret` |
| `ZERODHA_TOTP_KEY` | Zerodha TOTP key for 2FA | `your_totp_key` |
| `ZERODHA_USER_ID` | Zerodha user ID | `your_user_id` |
| `ZERODHA_PASSWORD` | Zerodha account password | `your_password` |
| `N8N_WEBHOOK_URL` | N8N webhook endpoint | `https://n8n.example.com/webhook/endpoint` |
| `N8N_USERNAME` | N8N authentication username | `your_username` |
| `N8N_PASSWORD` | N8N authentication password | `your_password` |
| `N8N_AUTH_TOKEN` | Base64 encoded auth token | `base64_encoded_token` |

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Ensure `.env` is in `.gitignore`:**
   The `.gitignore` file already includes `.env` to prevent accidental commits.

4. **Verify file permissions:**
   ```bash
   chmod 600 .env  # Only owner can read/write
   ```

## Security Best Practices

### Before Sharing or Deploying

- ✅ Verify `.env` is listed in `.gitignore`
- ✅ Remove any hardcoded credentials from source code
- ✅ Change all default passwords and API keys
- ✅ Use strong, unique passwords (minimum 12 characters)
- ✅ Enable 2FA wherever possible
- ✅ Review commit history for accidentally committed secrets

### Production Deployment

1. **Use environment-specific configurations:**
   - Development: `.env.development`
   - Staging: `.env.staging`
   - Production: `.env.production`

2. **Use secure credential management:**
   - Consider using services like AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
   - Use environment variables in CI/CD pipelines

3. **Database Security:**
   - Use SSL/TLS for database connections
   - Restrict database access by IP address
   - Use strong database passwords
   - Regularly backup your database

4. **API Security:**
   - Keep documentation endpoints protected with strong credentials
   - Use HTTPS in production
   - Implement rate limiting
   - Monitor for suspicious activity

5. **Regular Security Audits:**
   - Update dependencies regularly
   - Scan for vulnerabilities: `pip-audit`
   - Review access logs
   - Rotate API keys and passwords periodically

## Checking for Exposed Secrets

Before pushing to a public repository:

```bash
# Search for potential secrets in code
grep -r "password\|api_key\|secret\|token" --include="*.py" --exclude-dir=".env*"

# Check git history for secrets
git log --all --full-history --source --pretty=format: -- .env | cat

# Use git-secrets or similar tools
git secrets --scan
```

## What to Do If Credentials Are Exposed

1. **Immediately rotate all exposed credentials**
2. **Change affected passwords and API keys**
3. **Review access logs for unauthorized access**
4. **Remove sensitive data from git history:**
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. **Force push to remote (if necessary):**
   ```bash
   git push origin --force --all
   ```

## Contact

For security concerns or to report vulnerabilities, please contact the project maintainers.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security.html)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
