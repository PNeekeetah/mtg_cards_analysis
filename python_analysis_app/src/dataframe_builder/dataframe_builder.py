

from typing import Dict, List, Tuple
import pandas as pd
from src.models.card_entry import CardEntry
from src.index.card_index import CardIndex
from src.models.scryfall_card_details import ScryfallCardDetails
from src.models.prices import Prices



def compute_min_prices(printings: List[ScryfallCardDetails]) -> Dict[str, float | None]:
    """
    Compute absolute minimum prices across all printings.
    """
    nonfoil_prices = []
    foil_prices = []

    for p in printings:
        prices : Prices = p.prices
        if prices.usd:
            nonfoil_prices.append(prices.usd)
        if prices.usd_foil:
            foil_prices.append(prices.usd_foil)

    min_usd_nonfoil = min(nonfoil_prices) if nonfoil_prices else None
    min_usd_foil = min(foil_prices) if foil_prices else None

    return {
        "min_usd_nonfoil": min_usd_nonfoil,
        "min_usd_foil": min_usd_foil,
    }


def extract_metadata(printings: List[ScryfallCardDetails]) -> dict:
    # Not much will have changed between reprints of the same card. Fine to get the first one
    first_card = printings[0]
    
    # Rarities can change
    all_rarities = list({p.rarity for p in printings})
    
    # Years can definitely change
    years_printed = sorted(list({
        int(p.released_at[:4])
        for p in printings
        if p.released_at is not None
    })) 
    
    # The price of a card is different based on the year of printing. Get the minimum to get a rough idea.
    min_prices = compute_min_prices(printings)
    colors = sorted(first_card.colors if first_card.colors else [])
    return {
        "text": first_card.oracle_text,
        "colors": colors,
        "rarities": sorted(all_rarities),
        "years": years_printed,
        **min_prices,
    }

def build_collection_dataframe(
    collection: List[CardEntry],
    card_index: CardIndex
) -> Tuple[pd.DataFrame, List[CardEntry]]:
    rows = []
    missing = []
    for card_entry in collection:
        card_entry : CardEntry
        
        if card_entry.name not in card_index.all_card_names:
            missing.append(card_entry)
            continue

        printings = card_index.find_by_name(card_entry.name) 
        metadata = extract_metadata(printings)

        unit_price = (
            metadata["min_usd_foil"] if card_entry.foil else metadata["min_usd_nonfoil"]
        )

        total_value = unit_price * card_entry.quantity if unit_price is not None else None
        rows.append({
            "name": card_entry.name.title(),
            "quantity": card_entry.quantity,
            "foil": card_entry.foil,
            "colors": metadata["colors"],
            "rarities": metadata["rarities"],
            "years": metadata["years"],
            "unit_price": unit_price,
            "total_value": total_value,
            "text": metadata["text"]
        })

    return pd.DataFrame(rows), missing