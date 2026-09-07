"""Target hedge funds for the 13F sector-rotation study.

Codes are the `m=` parameter used by dataroma's holdings/portfolio-history
pages (https://www.dataroma.com/m/hist/p_hist.php?f=<code>).
"""

FUNDS = {
    "psc": "Bill Ackman - Pershing Square Capital Management",
    "VFC": "Valley Forge Capital Management",
    "AM":  "David Tepper - Appaloosa Management",
    "AC":  "Chuck Akre - Akre Capital Management",
    "BRK": "Warren Buffett - Berkshire Hathaway",
    "HC":  "Li Lu - Himalaya Capital Management",
    "tci": "Chris Hohn - TCI Fund Management",
    "DA":  "Pat Dorsey - Dorsey Asset Management",
}

# Short display name for charts
SHORT_NAME = {
    "psc": "Pershing Square (Ackman)",
    "VFC": "Valley Forge",
    "AM":  "Appaloosa (Tepper)",
    "AC":  "Akre Capital",
    "BRK": "Berkshire (Buffett)",
    "HC":  "Himalaya (Li Lu)",
    "tci": "TCI (Hohn)",
    "DA":  "Dorsey Asset",
}
