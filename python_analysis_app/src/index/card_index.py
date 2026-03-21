import orjson
from typing import List, Any, Set
from src.models.scryfall_card_details import ScryfallCardDetails
from functools import cache
    
class CardIndex:
    def __init__(self):
        self.cards : List[ScryfallCardDetails] = []
    
    def add_card(self, card_data: ScryfallCardDetails):
        assert isinstance(card_data, ScryfallCardDetails)
        self.cards.append(card_data)
        
    def add_cards( self, cards_data: List[ScryfallCardDetails]):
        assert all(isinstance(card, ScryfallCardDetails) for card in cards_data)
        self.cards.extend(cards_data)
    
    def find_by_property(self, property_name: str, value: Any) -> List[ScryfallCardDetails]:
        if isinstance(value, str):
            value = value.lower()
            return [card for card in self.cards if getattr(card, property_name).lower() == value]
            
        return [card for card in self.cards if getattr(card, property_name) == value]
    
    @cache
    def find_by_name(self, value: Any) -> List[ScryfallCardDetails]:
        return [card for card in self.cards if card.name == value]
    
    
    @property
    def all_card_names(self) -> Set[str]:
        return {card.name for card in self.cards}
    
    @classmethod
    def create_reduced_index(cls, price_file: str, card_names_filter: Set[str]) -> 'CardIndex':
        """
        Creates a reduced index containing only the specified card names.
        
        card_names: Set of card names to include in the reduced index.
        """
        reduced_index = CardIndex()
        
        with open(price_file, "rb") as f:
            cards = orjson.loads(f.read())
            
        for card in cards:
            if card["name"].lower() in card_names_filter:
                reduced_index.add_card(ScryfallCardDetails(**card))

        return reduced_index

    @classmethod
    def create_card_index(cls, price_file: str) -> 'CardIndex':
        """
        Utility to build a card index from the file.
        """
        card_index = CardIndex()
        
        with open(price_file, "rb") as f:
            cards = orjson.loads(f.read())

        for card in cards:
            card_index.add_card(ScryfallCardDetails(**card))

        return card_index

