import os


_ALLOWED_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}


def get_log_level() -> str:
    """
    Returns the effective log level for the application.

    Behavior:

    - Reads LOG_LEVEL from OS environment variables using os.getenv
    - If LOG_LEVEL is missing or None → returns "INFO"
    - If LOG_LEVEL is an empty string → returns "INFO"
    - Normalizes input by:
        - stripping leading/trailing whitespace
        - converting to uppercase
    - Validates normalized value against allowed log levels:
        DEBUG, INFO, WARNING, ERROR, CRITICAL
    - If value is not in allowed set → returns "INFO"
    - Never raises exceptions
    - Always returns a valid logging level string
    """

    value = os.getenv("LOG_LEVEL")

    if value is None:
        return "INFO"

    normalized = value.strip().upper()

    if not normalized:
        return "INFO"

    if normalized not in _ALLOWED_LOG_LEVELS:
        return "INFO"

    return normalized
