"use client";

import { useState } from "react";
import type { ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import * as T from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { fmtNum } from "@/core/util/format";
import { NumberInput, SelectInput } from "../../ui";

type Unit = "kg" | "mj";
const RISK_WORD = { fire_high: "vysoké", fire_ordinary: "obvyklé", fire_low: "nízké" } as const;

/**
 * Volba rf (tab. C.5) s podkladem v měrném požárním zatížení podle pozn. 5–8.
 * Zatížení z PBŘ lze zadat v kg/m² (ČSN 73 0802, ekvivalent dřeva 17 MJ/kg) nebo v MJ/m².
 */
export function FireRiskInput({
  zone,
  options,
  onChange,
}: {
  zone: ZoneInput;
  options: { value: ZoneInput["fireRisk"]; label: string }[];
  onChange: (fn: (z: ZoneInput) => void) => void;
}) {
  const [unit, setUnit] = useState<Unit>("kg");
  const explosive = zone.fireRisk.startsWith("explosion");
  const mj = zone.fireLoadMJ ?? null;
  const shown = mj == null ? null : unit === "kg" ? Math.round((mj / T.FIRE_LOAD_MJ_PER_KG) * 10) / 10 : mj;
  const byLoad = mj != null ? T.rfFromFireLoad(mj) : null;
  const rowHelp = T.TABLE_RF.rows[zone.fireRisk]?.help;

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label="Riziko požáru nebo výbuchu (rf)"
          value={zone.fireRisk}
          onChange={(v) => onChange((z) => (z.fireRisk = v))}
          options={options}
          help={explosive || zone.fireRisk === "none" ? rowHelp : "Podle požárně bezpečnostního řešení (PBŘ) a poznámek 5–8 k tab. C.5 níže."}
        />
        {!explosive && (
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <NumberInput
                  label="Měrné požární zatížení (z PBŘ)"
                  value={shown}
                  placeholder="nepovinné"
                  onChange={(v) =>
                    onChange((z) => {
                      if (v == null) {
                        z.fireLoadMJ = null;
                        return;
                      }
                      const val = unit === "kg" ? v * T.FIRE_LOAD_MJ_PER_KG : v;
                      z.fireLoadMJ = Math.round(val * 10) / 10;
                      if (z.fireRisk !== "none") z.fireRisk = T.rfFromFireLoad(z.fireLoadMJ);
                    })
                  }
                />
              </div>
              <select className="input w-auto" aria-label="Jednotka požárního zatížení" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="kg">kg/m²</option>
                <option value="mj">MJ/m²</option>
              </select>
            </div>
            <p className="field-help">
              {mj != null
                ? `${fmtNum(mj)} MJ/m² → ${RISK_WORD[byLoad!]} riziko požáru podle pozn. 5–7 k tab. C.5.`
                : "Zadáte-li hodnotu, riziko požáru se nastaví podle pozn. 5–7 k tab. C.5."}{" "}
              {unit === "kg" && `kg/m² podle ČSN 73 0802 (ekvivalent dřeva, 1 kg/m² = ${T.FIRE_LOAD_MJ_PER_KG} MJ/m²).`}
            </p>
          </div>
        )}
      </div>
      {!explosive && (
        <div className="space-y-1 border-l-2 border-line pl-3 text-[0.8125rem] text-muted">
          <p>{T.TABLE_RF.rows.fire_high.help}</p>
          <p>{T.TABLE_RF.rows.fire_ordinary.help}</p>
          <p>{T.TABLE_RF.rows.fire_low.help}</p>
          <p>{T.RF_NOTE_8}</p>
          <p className="text-ink-soft">
            Poznámky říkají „mohou být pokládány“ – hořlavá konstrukce nebo střecha je důvod zvážit vysoké riziko, ne automatické zařazení. Rozhoduje projektant podle PBŘ.
          </p>
        </div>
      )}
    </div>
  );
}
