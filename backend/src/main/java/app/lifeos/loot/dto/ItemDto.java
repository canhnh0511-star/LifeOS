package app.lifeos.loot.dto;

import java.time.LocalDate;

/** Mirrors the contract's `Item`: the catalog entry plus this user's ownership. */
public record ItemDto(String code, String name, String story, String slot, String rarity, String area, String artKey, boolean owned, boolean equipped, LocalDate acquiredDate) {}
