package app.lifeos.loot.service;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.loot.dto.ItemDto;
import app.lifeos.loot.model.UserItem;
import app.lifeos.loot.repository.UserItemRepository;
import app.lifeos.common.time.UserClock;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Items dropped by daily chests (ADR-034). The drop is a pure function of (user, day, tier) and what the user already owns, so it can
 * be reproduced and audited; there is no hidden randomness. A chest drops at most one item, never one the user already has, and
 * revoking the chest takes the item back (and unequips it). Items change how the character looks and never give XP.
 */
@Service
public class LootService {
    private static final Logger log = LoggerFactory.getLogger(LootService.class);

    private final UserItemRepository items;
    private final UserClock clock;
    private final EntityManager em;

    public LootService(UserItemRepository items, UserClock clock, EntityManager em) { this.items = items; this.clock = clock; this.em = em; }

    static String sourceKey(LocalDate day, String tier) { return day + ":" + tier; }

    private void lock(UUID userId) {
        em.createNativeQuery("select pg_advisory_xact_lock(hashtext(:k))").setParameter("k", "loot:" + userId).getSingleResult();
    }

    /** Index in [0, size) derived from the chest identity; the same chest and the same inventory always give the same item. */
    public static int pick(UUID userId, LocalDate day, String tier, int size) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest((userId + "|" + day + "|" + tier).getBytes(StandardCharsets.UTF_8));
            long v = ((h[0] & 0xFFL) << 24) | ((h[1] & 0xFFL) << 16) | ((h[2] & 0xFFL) << 8) | (h[3] & 0xFFL);
            return (int) (v % size);
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    /** Called when a chest was just granted. Returns the dropped item code, or empty when the pool is exhausted. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<String> drop(UUID userId, LocalDate day, String tier) {
        lock(userId);
        Optional<UserItem> existing = items.findByUserIdAndSourceKey(userId, sourceKey(day, tier));
        if (existing.isPresent()) return Optional.of(existing.get().getItemCode());
        Set<String> owned = items.findByUserId(userId).stream().map(UserItem::getItemCode).collect(Collectors.toSet());
        var pool = ItemCatalog.poolFor(tier);
        List<ItemCatalog.Item> candidates = ItemCatalog.ITEMS.stream().filter(i -> pool.contains(i.rarity()) && !owned.contains(i.code()))
            .sorted(Comparator.comparing(ItemCatalog.Item::code)).toList();
        if (candidates.isEmpty()) return Optional.empty();
        ItemCatalog.Item chosen = candidates.get(pick(userId, day, tier, candidates.size()));
        items.save(new UserItem(userId, chosen.code(), chosen.slot().name(), sourceKey(day, tier), clock.now()));
        items.flush();
        log.info("loot.dropped userId={} date={} tier={} item={}", userId, day, tier, chosen.code());
        return Optional.of(chosen.code());
    }

    /** Called when a chest was revoked: the item goes back, unequipped. Returns its code if there was one. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<String> revoke(UUID userId, LocalDate day, String tier) {
        lock(userId);
        Optional<UserItem> row = items.findByUserIdAndSourceKey(userId, sourceKey(day, tier));
        row.ifPresent(r -> { items.delete(r); items.flush(); log.info("loot.revoked userId={} date={} tier={} item={}", userId, day, tier, r.getItemCode()); });
        return row.map(UserItem::getItemCode);
    }

    @Transactional(readOnly = true)
    public Optional<String> itemFor(UUID userId, LocalDate day, String tier) {
        return items.findByUserIdAndSourceKey(userId, sourceKey(day, tier)).map(UserItem::getItemCode);
    }

    @Transactional(readOnly = true)
    public List<ItemDto> list(UUID userId) {
        Map<String, UserItem> byCode = new HashMap<>();
        for (UserItem u : items.findByUserId(userId)) byCode.put(u.getItemCode(), u);
        return ItemCatalog.ITEMS.stream().map(i -> view(i, byCode.get(i.code()))).toList();
    }

    @Transactional
    public ItemDto equip(UUID userId, String code) {
        lock(userId);
        UserItem mine = owned(userId, code);
        for (UserItem other : items.findByUserIdAndSlotAndEquippedTrue(userId, mine.getSlot())) if (!other.getItemCode().equals(code)) other.setEquipped(false);
        items.flush(); // free the slot before the partial unique index sees the new one
        mine.setEquipped(true);
        items.flush();
        return view(ItemCatalog.find(code).orElseThrow(), mine);
    }

    @Transactional
    public ItemDto unequip(UUID userId, String code) {
        lock(userId);
        UserItem mine = owned(userId, code);
        mine.setEquipped(false);
        items.flush();
        return view(ItemCatalog.find(code).orElseThrow(), mine);
    }

    private UserItem owned(UUID userId, String code) {
        return items.findByUserIdAndItemCode(userId, code).orElseThrow(() -> FieldErrors.notFound("vật phẩm"));
    }

    private ItemDto view(ItemCatalog.Item i, UserItem u) {
        LocalDate acquired = u == null ? null : LocalDate.parse(u.getSourceKey().substring(0, 10));
        return new ItemDto(i.code(), i.name(), i.story(), i.slot().name(), i.rarity().name(), i.area(), i.artKey(), u != null, u != null && u.isEquipped(), acquired);
    }
}
