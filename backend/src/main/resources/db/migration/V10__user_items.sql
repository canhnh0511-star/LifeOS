-- Items dropped by daily reward chests (ADR-034). The catalog lives in code; a row is ownership. One row per chest (source_key = "<date>:<tier>"),
-- so a chest can drop at most one item and revoking the chest removes it. `slot` is copied from the catalog so "one equipped item per slot" is a database rule.
CREATE TABLE user_items (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id),
    item_code   VARCHAR(40)  NOT NULL,
    slot        VARCHAR(12)  NOT NULL CHECK (slot IN ('WEAPON','HEAD','CLOAK','FEET','RELIC')),
    source_key  VARCHAR(30)  NOT NULL,
    equipped    BOOLEAN      NOT NULL DEFAULT FALSE,
    acquired_at TIMESTAMPTZ  NOT NULL,
    UNIQUE (user_id, item_code),
    UNIQUE (user_id, source_key)
);
CREATE UNIQUE INDEX uq_user_items_equipped_slot ON user_items (user_id, slot) WHERE equipped;
