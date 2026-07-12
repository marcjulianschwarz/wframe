"""Infisical secret injection.

At import time (from config.py) we log into the self-hosted Infisical with a
machine identity, pull all secrets for the environment, and inject them into
os.environ *before* Settings is built. Secrets then look like normal env vars.

os.environ.setdefault means any value already set locally (e.g. in .env) wins,
so local overrides keep working and local dev without Infisical is unaffected.
"""

import logging
import os

logger = logging.getLogger(__name__)


def inject_infisical_secrets() -> None:
    """Log into Infisical and inject all secrets for the env into os.environ."""
    client_id = os.getenv("INFISICAL_CLIENT_ID", "")
    client_secret = os.getenv("INFISICAL_CLIENT_SECRET", "")
    project_id = os.getenv("INFISICAL_PROJECT_ID", "")
    infisical_host = os.getenv("INFISICAL_HOST", "")
    environment = os.getenv("INFISICAL_ENVIRONMENT", "prod")

    if not (client_id and client_secret and project_id and infisical_host):
        logger.info("Infisical credentials not set, skipping secret injection")
        return

    # Imported lazily so the dependency is only needed where Infisical is used.
    from infisical_sdk import InfisicalSDKClient

    try:
        client = InfisicalSDKClient(host=infisical_host)
        client.auth.universal_auth.login(
            client_id=client_id, client_secret=client_secret
        )
        result = client.secrets.list_secrets(
            project_id=project_id,
            environment_slug=environment,
            secret_path="/",
        )
    except Exception:
        logger.exception("Failed to load secrets from Infisical")
        raise

    for secret in result.secrets:
        # setdefault -> a value already set locally (.env) takes precedence.
        os.environ.setdefault(secret.secretKey, secret.secretValue)

    logger.info(
        "Injected %d secrets from Infisical (env=%s)",
        len(result.secrets),
        environment,
    )
