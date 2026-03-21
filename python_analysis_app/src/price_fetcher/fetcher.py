
from datetime import date
import os
import json
import requests

SCRYFALL_BULK_URL = "https://api.scryfall.com/bulk-data" # All the cards that are out there
PRICE_DIR = "prices"
DEFAULT_CARDS_NAME = "Default Cards" # The name of the collection we want to get

# Error
class APIError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code

# Utilities

def today_suffix() -> str:
    return date.today().isoformat()

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)
    
def get_dir_contents(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    return os.listdir(path)

# Main price fetcher class

class PriceFetcher:
    def __init__(self, base_url: str = SCRYFALL_BULK_URL, price_dir: str = PRICE_DIR, session = None):
        self.base_url = base_url
        self.price_dir = price_dir
        self.session = session if session is not None else requests.Session()

    
    def fetch_default_cards_bulk(self, get_existing : bool = False, collection_name : str = DEFAULT_CARDS_NAME) -> str:
        """
        Fetch today's default_cards bulk JSON if not cached.
        Returns filepath to the JSON file.
        
        get_existing: return the most recent file if it exists
        """
        ensure_dir(self.price_dir)
        today_file = os.path.join(self.price_dir, f"prices_{today_suffix()}.json")
        
        
        if os.path.exists(today_file):
            return today_file
        
        if get_existing:
            existing_files = sorted(get_dir_contents(self.price_dir), reverse=True)
            for filename in existing_files:
                if filename.startswith("prices_") and filename.endswith(".json"):
                    return os.path.join(self.price_dir, filename)
            
            print("No existing price files found, fetching new data...")
            
        # Past this point, we know it doesn't exist, so we need to fetch it.
        
        response = self.session.get(self.base_url)
        if response.status_code != 200:
            raise APIError( f"Failed to fetch bulk data: {response.status_code}", response.status_code)
        
        bulk_data = response.json()

        default_cards = next(
            obj for obj in bulk_data["data"]
            if obj.get("name") == collection_name
        )

        download_uri = default_cards["download_uri"]
        
        cards_response = self.session.get(download_uri)
        if cards_response.status_code != 200:
            raise APIError( f"Failed to fetch default cards data: {cards_response.status_code}", cards_response.status_code)

        cards = cards_response.json()

        with open(today_file, "w", encoding="utf-8") as f:
            json.dump(cards, f)

        return today_file
