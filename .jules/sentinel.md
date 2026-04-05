## 2025-02-27 - [Fix SSRF bypass for loopback IPs]
**Vulnerability:** Node's `URL` normalizes IP bypass strings like `0x7f.0.0.1` and `2130706433` to `127.0.0.1`, but doesn't handle `127.0.0.2` or other loopback addresses which are not string-matched by `BLOCKED_HOSTNAMES`.
**Learning:** Checking for loopback bypass relies on standard regex normalization against the parsed hostname of `new URL()` instead of matching static string addresses like `localhost` or `127.0.0.1`.
**Prevention:** Add the entire `127.0.0.0/8` CIDR range to blocked loopback validations using regex: `/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/`.
