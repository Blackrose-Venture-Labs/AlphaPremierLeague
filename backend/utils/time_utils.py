"""
Time Utility Functions
----------------------
Provides timezone-aware datetime functions for the application.
"""

from datetime import datetime
import pytz

# IST timezone
IST = pytz.timezone('Asia/Kolkata')


def get_ist_now():
    """
    Get current datetime in IST (Indian Standard Time) as a naive datetime.
    This returns a timezone-naive datetime that represents IST time,
    suitable for storing in PostgreSQL TIMESTAMP WITHOUT TIME ZONE columns.
    
    Returns:
        datetime: Current datetime in IST timezone (timezone-naive)
    """
    return datetime.now(IST).replace(tzinfo=None)


def utc_to_ist(utc_dt):
    """
    Convert UTC datetime to IST.
    
    Args:
        utc_dt (datetime): UTC datetime object
        
    Returns:
        datetime: Datetime converted to IST timezone
    """
    if utc_dt.tzinfo is None:
        # If naive datetime, assume it's UTC
        utc_dt = pytz.utc.localize(utc_dt)
    return utc_dt.astimezone(IST)


def ist_to_utc(ist_dt):
    """
    Convert IST datetime to UTC.
    
    Args:
        ist_dt (datetime): IST datetime object
        
    Returns:
        datetime: Datetime converted to UTC timezone
    """
    if ist_dt.tzinfo is None:
        # If naive datetime, assume it's IST
        ist_dt = IST.localize(ist_dt)
    return ist_dt.astimezone(pytz.utc)