"""Shared rate limiter for the public, unauthenticated kiosk endpoints (/attendance/mark,
/employees/register). Lives in its own module (rather than in main.py) so route modules can
import `limiter` without a circular import back through main.py.

Keyed by client IP - fine for a handful of physical kiosks, though it does mean every walk-up
person behind the same NAT'd IP shares one budget.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
