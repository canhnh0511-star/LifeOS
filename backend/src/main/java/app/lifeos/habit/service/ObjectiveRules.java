package app.lifeos.habit.service;

import app.lifeos.common.error.FieldErrors;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Validation of a habit's checklist, shared by create, edit and import so the limits and messages are the same everywhere. */
public final class ObjectiveRules {
    public static final int MAX_OBJECTIVES = 20;

    private ObjectiveRules() {}

    public record Parsed(String title, int target, String unit, int step) {}

    /** `raw` is the JSON array as received. Returns the validated list; field errors go to `errors` keyed `objectives[i].field`. */
    public static List<Parsed> parse(Object raw, FieldErrors errors, String prefix) {
        List<Parsed> out = new ArrayList<>();
        if (raw == null) return out;
        if (!(raw instanceof List<?> list)) { errors.add(prefix + "objectives", "Danh sách mục tiêu không hợp lệ."); return out; }
        if (list.size() > MAX_OBJECTIVES) { errors.add(prefix + "objectives", "Tối đa " + MAX_OBJECTIVES + " mục tiêu cho một thói quen."); return out; }
        for (int i = 0; i < list.size(); i++) {
            String at = prefix + "objectives[" + i + "].";
            if (!(list.get(i) instanceof Map<?, ?> m)) { errors.add(prefix + "objectives[" + i + "]", "Mục tiêu không hợp lệ."); continue; }
            Object title = m.get("title"), target = m.get("target"), unit = m.get("unit"), step = m.get("step");
            boolean ok = true;
            if (!(title instanceof String t) || t.isBlank()) { errors.add(at + "title", "Tên mục tiêu không được để trống."); ok = false; }
            else if (t.trim().length() > 100) { errors.add(at + "title", "Tên mục tiêu tối đa 100 ký tự."); ok = false; }
            if (!(target instanceof Integer tg) || tg < 1 || tg > 10000) { errors.add(at + "target", "Mục tiêu phải là số nguyên từ 1 đến 10000."); ok = false; }
            if (unit != null && !(unit instanceof String)) { errors.add(at + "unit", "Đơn vị không hợp lệ."); ok = false; }
            else if (unit instanceof String u && u.trim().length() > 20) { errors.add(at + "unit", "Đơn vị tối đa 20 ký tự."); ok = false; }
            boolean targetOk = target instanceof Integer tg2 && tg2 >= 1 && tg2 <= 10000;
            int tgValue = targetOk ? (Integer) target : 1;
            // The step is only checked against a target that is itself valid, so one mistake is reported once.
            if (step != null && (!(step instanceof Integer s) || s < 1 || (targetOk && s > tgValue))) { errors.add(at + "step", "Bước phải là số nguyên từ 1 đến mục tiêu."); ok = false; }
            if (ok) out.add(new Parsed(((String) title).trim(), (Integer) target, unit == null ? "" : ((String) unit).trim(), step == null ? 1 : (Integer) step));
        }
        return out;
    }
}
