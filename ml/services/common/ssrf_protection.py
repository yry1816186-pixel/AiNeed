from __future__ import annotations

import ipaddress
import logging
import re
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fe80::/10"),
]

ALLOWED_SCHEMES = {"https", "http"}

BLOCKED_HOSTNAMES = re.compile(
    r"^(localhost|metadata\.google\.internal|metadata\.azure\.com)"
    r"(\.|$)",
    re.IGNORECASE,
)

DEFAULT_ALLOWED_DOMAINS: list[str] = []

IMAGE_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "image/bmp", "image/tiff",
}

MAX_URL_LENGTH = 2048


class SSRFValidationError(ValueError):
    pass


def validate_url(
    url: str,
    *,
    allowed_domains: list[str] | None = None,
    allowed_schemes: set[str] | None = None,
    max_length: int = MAX_URL_LENGTH,
) -> str:
    if not url or not isinstance(url, str):
        raise SSRFValidationError("URL must be a non-empty string")

    url = url.strip()

    if len(url) > max_length:
        raise SSRFValidationError(f"URL exceeds maximum length of {max_length}")

    try:
        parsed = urlparse(url)
    except Exception as e:
        raise SSRFValidationError(f"Invalid URL format: {e}") from e

    schemes = allowed_schemes or ALLOWED_SCHEMES
    if parsed.scheme not in schemes:
        raise SSRFValidationError(f"URL scheme '{parsed.scheme}' not allowed (allowed: {schemes})")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("URL must have a hostname")

    if BLOCKED_HOSTNAMES.match(hostname):
        raise SSRFValidationError(f"Hostname '{hostname}' is blocked (metadata/localhost)")

    try:
        import socket
        resolved_ips = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for family, _type, _proto, _canonname, sockaddr in resolved_ips:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            for network in PRIVATE_NETWORKS:
                if ip in network:
                    raise SSRFValidationError(
                        f"Hostname '{hostname}' resolves to private IP '{ip_str}' "
                        f"(network: {network})"
                    )
    except SSRFValidationError:
        raise
    except Exception as e:
        logger.warning("DNS resolution check failed for '%s': %s", hostname, e)

    domains = allowed_domains or DEFAULT_ALLOWED_DOMAINS
    if domains:
        hostname_lower = hostname.lower()
        if not any(
            hostname_lower == d.lower() or hostname_lower.endswith("." + d.lower())
            for d in domains
        ):
            raise SSRFValidationError(
                f"Hostname '{hostname}' not in allowed domains: {domains}"
            )

    return url


def validate_image_url(url: str, *, allowed_domains: list[str] | None = None) -> str:
    return validate_url(url, allowed_domains=allowed_domains)


def validate_image_response(content_type: str | None, max_size_bytes: int = 20 * 1024 * 1024) -> None:
    if content_type:
        ct_lower = content_type.lower().split(";")[0].strip()
        if ct_lower and ct_lower not in IMAGE_CONTENT_TYPES:
            raise SSRFValidationError(
                f"Response content-type '{ct_lower}' is not an allowed image type"
            )
