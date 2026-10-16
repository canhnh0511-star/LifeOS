package app.lifeos.loot.repository;

import app.lifeos.loot.model.UserItem;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserItemRepository extends JpaRepository<UserItem, UUID> {
    List<UserItem> findByUserId(UUID userId);
    Optional<UserItem> findByUserIdAndItemCode(UUID userId, String itemCode);
    Optional<UserItem> findByUserIdAndSourceKey(UUID userId, String sourceKey);
    List<UserItem> findByUserIdAndSlotAndEquippedTrue(UUID userId, String slot);
}
