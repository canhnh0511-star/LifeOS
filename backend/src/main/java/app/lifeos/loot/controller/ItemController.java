package app.lifeos.loot.controller;

import app.lifeos.loot.dto.ItemDto;
import app.lifeos.loot.service.LootService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/items")
class ItemController {
    private final LootService service;

    ItemController(LootService service) { this.service = service; }

    @GetMapping
    List<ItemDto> list(Authentication auth) { return service.list(UUID.fromString(auth.getName())); }

    @PutMapping("/{code}/equipped")
    ItemDto equip(Authentication auth, @PathVariable String code) { return service.equip(UUID.fromString(auth.getName()), code); }

    @DeleteMapping("/{code}/equipped")
    ItemDto unequip(Authentication auth, @PathVariable String code) { return service.unequip(UUID.fromString(auth.getName()), code); }
}
