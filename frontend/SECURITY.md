# Security Policy

## Environment Variables

This project uses environment variables for configuration. Never commit files containing sensitive data like API keys, passwords, or credentials.

### Required Environment Variables

Create a `.env` file in the root directory (already gitignored) with the following variables if needed:

```
# Add your environment variables here
# Example:
# REACT_APP_API_KEY=your_api_key_here
```

See `.env.example` for a template.

## Reporting a Vulnerability

If you discover a security vulnerability, please email the maintainers directly rather than opening a public issue.

## Safe Practices

- Never commit `.env` files
- Never commit API keys, tokens, or credentials in code
- Review all changes before pushing to ensure no sensitive data is included
- Use environment variables for all configuration that may contain sensitive data
