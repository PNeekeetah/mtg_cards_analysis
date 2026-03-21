


from typing import List

from src.models.card_entry import CardEntry


class CollectionFilter:
    """Handles deduplication of card collections."""
    
    @staticmethod
    def filter_duplicates(collection: List[CardEntry]) -> List[CardEntry]:
        """
        Remove duplicate cards from collection based on name and foil status.
        
        Cards with the same name and foil status are considered duplicates.
        Their quantities are combined into the first occurrence.
        
        Note: We don't account for year of printing or artwork differences.
        
        Args:
            collection: List of CardEntry objects to filter
            
        Returns:
            Deduplicated list with combined quantities
        """
        collection_copy = list(collection)
        
        card_key_index = {}  # (name, foil) -> index in collection
        to_remove = []  # indices to remove
        
        for i, card_entry in enumerate(collection_copy):
            card_key = (card_entry.name, card_entry.foil)
            
            if card_key in card_key_index:
                # Duplicate found - combine quantities
                first_entry_index = card_key_index[card_key]
                first_card = collection_copy[first_entry_index]
                first_card.update_quantity(card_entry.quantity)
                to_remove.append(i)
            else:
                card_key_index[card_key] = i
        
        # Remove duplicates in reverse order to maintain indices
        for index in reversed(to_remove):
            del collection_copy[index]
        
        return collection_copy