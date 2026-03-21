import csv
from typing import List
from pathlib import Path

from src.models.card_entry import CardEntry

COMMENT_SYMBOL = "#"
FOIL_CARD = "foil"
NAME_POSITION = 0
QUANTITY_POSITION = 1
FOIL_POSITION = 2
MINIMUM_FOIL_COLUMN_INDEX = 3
ROOT = "../personal_collection"


class CollectionParser:
    """Parses MTG collection files."""

    def __init__(self, root: str | Path = ROOT):
        """
        Initialize the parser with a root directory.

        Args:
            root: Path to the personal_collection directory
        """
        self.root = Path(root)

    def _parse_collection_raw(self, filepath: Path) -> List[CardEntry]:
        """
        Parse a collection file without filtering.

        Args:
            filepath: Path object pointing to the collection file

        Returns:
            Unfiltered list of CardEntry objects
        """
        collection = []

        with open(filepath, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)

            for row in reader:
                # Skip blank lines and comments
                if not row or row[0].startswith(COMMENT_SYMBOL):
                    continue

                # Parse: name, quantity, [foil]
                name = row[NAME_POSITION].strip().lower()
                qty = int(row[QUANTITY_POSITION].strip())
                is_foil = False

                if len(row) >= MINIMUM_FOIL_COLUMN_INDEX:
                    is_foil = row[FOIL_POSITION].strip().lower() == FOIL_CARD

                collection.append(CardEntry(name=name, quantity=qty, foil=is_foil))

        return collection

    def parse(self, collection_name: str) -> List[CardEntry]:
        """
        Parse and filter a collection file by name.

        Args:
            collection_name: Filename of the collection (relative to root)

        Returns:
            Filtered list of CardEntry objects
        """
        filepath = self.root / collection_name
        collection = self._parse_collection_raw(filepath)
        return collection
