"use client";

import { buildingType, SYSTEM_PRESETS } from "@/catalog";
import type { InternalSystemInput, ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import type { LossType } from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { defaultInsideZone } from "@/domain/project";
import { Checkbox, Notice, NumberInput, SelectInput, TextInput } from "../../ui";
import { LossSelect } from "../loss-select";
import { HZ_OPTIONS, KS3_OPTIONS, LOSS_TABLES, LOSS_TYPE_LABELS, RF_OPTIONS, RT_FLOOR_OPTIONS, UW_OPTIONS } from "../options";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

const uid = () => Math.random().toString(36).slice(2, 9);

function outsideZone(): ZoneInput {
  return {
    id: `z-${uid()}`,
    name: "Venkovní prostor do 3 m od svodů",
    location: "outside",
    persons: 1,
    hoursPerYear: 100,
    floor: "agricultural_concrete",
    pta: ["none"],
    ptu: "none",
    fireRisk: "none",
    fireProvisions: "none",
    specialHazard: "none",
    l1: { lt: { source: "table", key: "all" }, lf: { source: "table", key: "other" }, lo: null },
    l2: null,
    l3: null,
    l4: { lt: null, lf: { source: "table", key: "other" }, lo: { source: "table", key: "other" }, shareAnimals: 0, shareTotal: 0, shareSystems: 0 },
    shieldExternal: { wm: null, continuous: false },
    shieldInternal: { wm: null, continuous: false },
    internalSystems: [],
  };
}

export function StepZones({ data, update, issues }: StepProps) {
  const calc = calcOf(data);
  const t = buildingType(data.buildingType);
  const lossTypes = calc.lossTypes ?? { L1: true, L2: false, L3: false, L4: false };
  const options = calc.options ?? { l1InternalSystemsEndangerLife: false, l4Animals: false };
  const zones = calc.zones ?? [];
  const lines = calc.lines ?? [];

  const setZone = (i: number, fn: (z: ZoneInput) => void) =>
    update((d) => {
      const c = calcOf(d);
      const z = c.zones![i];
      fn(z);
      setProvenance(d, `calc.zones[${i}]`, manual());
    });

  const setRoot = (fn: (c: ReturnType<typeof calcOf>) => void, path: string) =>
    update((d) => {
      fn(calcOf(d));
      setProvenance(d, path, manual());
    });

  const ensureLossData = (z: ZoneInput, loss: LossType) => {
    if (loss === "L2" && !z.l2) z.l2 = { lf: { source: "table", key: "gas_water_power" }, lo: { source: "table", key: "gas_water_power" }, servedUsers: 0 };
    if (loss === "L3" && !z.l3) z.l3 = { lf: { source: "table", key: "museums_galleries" }, valueShare: z.location === "inside" ? 1 : 0 };
    if (loss === "L4" && !z.l4) z.l4 = { lt: null, lf: { source: "table", key: t.l4Lf }, lo: { source: "table", key: t.l4Lo }, shareAnimals: 0, shareTotal: 1, shareSystems: 1 };
  };

  return (
    <div className="space-y-8">
      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-semibold">Hodnocené druhy ztrát</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(LOSS_TYPE_LABELS) as LossType[]).map((l) => (
            <Checkbox
              key={l}
              label={LOSS_TYPE_LABELS[l]}
              checked={!!lossTypes[l]}
              onChange={(v) =>
                setRoot((c) => {
                  c.lossTypes = { ...lossTypes, [l]: v };
                  if (v) for (const z of c.zones ?? []) ensureLossData(z, l);
                  if (l === "L2" && v && c.structure && c.structure.totalServedUsers == null) c.structure.totalServedUsers = 1000;
                }, "calc.lossTypes")
              }
            />
          ))}
        </div>
        {issueFor(issues, "lossTypes") && <p className="text-sm text-bad">{issueFor(issues, "lossTypes")}</p>}
        {!lossTypes.L1 && <Notice tone="warning">Ztráta lidského života (L1) se u budov posuzuje téměř vždy. Vypněte ji jen s odůvodněním.</Notice>}
        {lossTypes.L1 && (
          <Checkbox
            label="Porucha vnitřních systémů může přímo ohrozit život (nebezpečí výbuchu, nemocnice s životně důležitými přístroji)"
            checked={options.l1InternalSystemsEndangerLife}
            help="Pak se do R1 zahrnují i složky RC, RM, RW, RZ a je nutné zadat ztrátu LO."
            onChange={(v) =>
              setRoot((c) => {
                c.options = { ...options, l1InternalSystemsEndangerLife: v };
                for (const z of c.zones ?? []) if (v && !z.l1.lo) z.l1.lo = { source: "table", key: t.l1Lo ?? "hospital_other" };
              }, "calc.options")
            }
          />
        )}
        {lossTypes.L4 && (t.extraQuestions.includes("animals") || options.l4Animals) && (
          <Checkbox
            label="V objektu mohou být ztracena zvířata (L4 – složky RA, RU)"
            checked={options.l4Animals}
            onChange={(v) =>
              setRoot((c) => {
                c.options = { ...options, l4Animals: v };
                for (const z of c.zones ?? []) if (v && z.l4 && !z.l4.lt) z.l4.lt = { source: "table", key: "animals" };
              }, "calc.options")
            }
          />
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {lossTypes.L1 && (
            <NumberInput
              label="Celkový počet osob v objektu nt"
              value={calc.structure?.totalPersons ?? null}
              onChange={(v) => setRoot((c) => ((c.structure ??= {}).totalPersons = v ?? 0), "calc.structure.totalPersons")}
              error={issueFor(issues, "structure.totalPersons")}
            />
          )}
          {lossTypes.L2 && (
            <NumberInput
              label="Celkový počet obsluhovaných uživatelů nt (L2)"
              value={calc.structure?.totalServedUsers ?? null}
              onChange={(v) => setRoot((c) => ((c.structure ??= {}).totalServedUsers = v), "calc.structure.totalServedUsers")}
              error={issueFor(issues, "structure.totalServedUsers")}
            />
          )}
          {lossTypes.L4 && (
            <NumberInput
              label="Přípustné riziko RT pro L4 (nepovinné)"
              value={calc.tolerableL4 ?? null}
              onChange={(v) => setRoot((c) => (c.tolerableL4 = v), "calc.tolerableL4")}
              help="Prázdné = typická hodnota 10⁻³. Zadejte např. 0,0001."
            />
          )}
        </div>
      </fieldset>

      {zones.map((z, i) => {
        const p = `zones[${i}]`;
        const rfOptions = RF_OPTIONS.filter((o) => !o.value.startsWith("explosion") || t.extraQuestions.includes("explosion") || z.fireRisk.startsWith("explosion"));
        return (
          <fieldset key={z.id} className="panel space-y-5 p-5">
            <legend className="px-1 font-semibold">
              Zóna {i + 1}: {z.name}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Název zóny" value={z.name} onChange={(v) => setZone(i, (zz) => (zz.name = v))} />
              <SelectInput
                label="Umístění"
                value={z.location}
                onChange={(v) => setZone(i, (zz) => (zz.location = v))}
                options={[
                  { value: "inside", label: "Uvnitř objektu" },
                  { value: "outside", label: "Vně objektu (do 3 m od svodů)" },
                ]}
              />
              <NumberInput label="Počet osob v zóně nz" value={z.persons} onChange={(v) => setZone(i, (zz) => (zz.persons = v ?? 0))} error={issueFor(issues, `${p}.persons`)} />
              <div>
                <NumberInput
                  label="Doba přítomnosti osob tz"
                  unit="h/rok"
                  value={z.hoursPerYear}
                  onChange={(v) => setZone(i, (zz) => (zz.hoursPerYear = v ?? 0))}
                  error={issueFor(issues, `${p}.hoursPerYear`)}
                />
                <div className="mt-1 flex gap-2 text-xs">
                  <button className="link" type="button" onClick={() => setZone(i, (zz) => (zz.hoursPerYear = 8760))}>
                    celý rok (8 760 h)
                  </button>
                  <button className="link" type="button" onClick={() => setZone(i, (zz) => (zz.hoursPerYear = 2080))}>
                    pracovní doba (2 080 h)
                  </button>
                </div>
              </div>
              <SelectInput label="Povrch podlahy / terénu (rt)" value={z.floor} onChange={(v) => setZone(i, (zz) => (zz.floor = v))} options={RT_FLOOR_OPTIONS} />
              <SelectInput
                label="Nebezpečí požáru nebo výbuchu (rf)"
                value={z.fireRisk}
                onChange={(v) => setZone(i, (zz) => (zz.fireRisk = v))}
                options={rfOptions}
                help="Podle požárně bezpečnostního řešení (měrné požární zatížení), případně dokumentace o ochraně před výbuchem."
              />
              <SelectInput label="Zvláštní nebezpečí – panika, evakuace (hz)" value={z.specialHazard} onChange={(v) => setZone(i, (zz) => (zz.specialHazard = v))} options={HZ_OPTIONS} />
            </div>

            <div className="grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
              {lossTypes.L1 && (
                <>
                  <LossSelect label="L1: ztráta úrazem LT" table={LOSS_TABLES.L1_LT} value={z.l1.lt} onChange={(v) => setZone(i, (zz) => (zz.l1.lt = v))} />
                  <LossSelect label="L1: ztráta fyzickou škodou LF" table={LOSS_TABLES.L1_LF} value={z.l1.lf} onChange={(v) => setZone(i, (zz) => (zz.l1.lf = v))} error={issueFor(issues, `${p}.l1.lf.note`)} />
                  {options.l1InternalSystemsEndangerLife && (
                    <LossSelect label="L1: ztráta poruchou systémů LO" table={LOSS_TABLES.L1_LO} value={z.l1.lo} onChange={(v) => setZone(i, (zz) => (zz.l1.lo = v))} error={issueFor(issues, `${p}.l1.lo`)} />
                  )}
                </>
              )}
              {lossTypes.L2 && z.l2 && (
                <>
                  <LossSelect label="L2: LF" table={LOSS_TABLES.L2_LF} value={z.l2.lf} onChange={(v) => setZone(i, (zz) => (zz.l2!.lf = v))} />
                  <LossSelect label="L2: LO" table={LOSS_TABLES.L2_LO} value={z.l2.lo} onChange={(v) => setZone(i, (zz) => (zz.l2!.lo = v))} />
                  <NumberInput label="L2: obsluhovaní uživatelé v zóně nz" value={z.l2.servedUsers} onChange={(v) => setZone(i, (zz) => (zz.l2!.servedUsers = v ?? 0))} />
                </>
              )}
              {lossTypes.L3 && z.l3 && (
                <>
                  <LossSelect label="L3: LF" table={LOSS_TABLES.L3_LF} value={z.l3.lf} onChange={(v) => setZone(i, (zz) => (zz.l3!.lf = v))} />
                  <NumberInput label="L3: podíl hodnoty kulturního dědictví v zóně cz/ct" value={z.l3.valueShare} onChange={(v) => setZone(i, (zz) => (zz.l3!.valueShare = v ?? 0))} help="0 až 1" />
                </>
              )}
              {lossTypes.L4 && z.l4 && (
                <>
                  <LossSelect label="L4: LF" table={LOSS_TABLES.L4_LF} value={z.l4.lf} onChange={(v) => setZone(i, (zz) => (zz.l4!.lf = v))} />
                  <LossSelect label="L4: LO" table={LOSS_TABLES.L4_LO} value={z.l4.lo} onChange={(v) => setZone(i, (zz) => (zz.l4!.lo = v))} />
                  {options.l4Animals && (
                    <>
                      <LossSelect label="L4: LT (zvířata)" table={LOSS_TABLES.L4_LT} value={z.l4.lt} onChange={(v) => setZone(i, (zz) => (zz.l4!.lt = v))} />
                      <NumberInput label="L4: podíl hodnoty zvířat ca/ct" value={z.l4.shareAnimals} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareAnimals = v ?? 0))} />
                    </>
                  )}
                  <NumberInput label="L4: podíl hodnoty zóny (ca+cb+cc+cs)/ct" value={z.l4.shareTotal} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareTotal = v ?? 0))} help="1 = celá hodnota objektu (konzervativní, nejsou-li údaje)" />
                  <NumberInput label="L4: podíl hodnoty systémů cs/ct" value={z.l4.shareSystems} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareSystems = v ?? 0))} />
                </>
              )}
            </div>

            <div className="space-y-3 border-t border-line-soft pt-4">
              <p className="font-semibold">Vnitřní systémy v zóně</p>
              <p className="text-sm text-ink-soft">Zadejte vnitřní systémy a vedení, ke kterým jsou připojeny. Na jedno vedení může být připojeno více systémů – pro složky z vedení se pak bere nejvyšší PSPD a nejnižší UW (čl. 6.9.1), PC a PM se kombinují.</p>
              {z.internalSystems.map((s, si) => (
                <div key={s.id} className="grid gap-3 border border-line-soft p-3 sm:grid-cols-[1.4fr_1fr_0.7fr_1.4fr_auto] sm:items-end">
                  <TextInput label="Systém" value={s.name} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].name = v))} />
                  <SelectInput
                    label="Připojené vedení"
                    value={s.lineId ?? "__none"}
                    onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].lineId = v === "__none" ? null : v))}
                    options={[{ value: "__none", label: "bez vnějšího vedení" }, ...lines.map((l) => ({ value: l.id, label: l.name }))]}
                    error={issueFor(issues, `${p}.internalSystems[${si}].lineId`)}
                  />
                  <SelectInput label="UW" value={s.uw} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].uw = v))} options={UW_OPTIONS} />
                  <SelectInput label="Vedení kabeláže (KS3)" value={s.ks3} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].ks3 = v))} options={KS3_OPTIONS} />
                  <Checkbox
                    label="Zařízení nevyhovuje výrobkovým normám (PM = 1)"
                    checked={s.nonCompliant === true}
                    onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].nonCompliant = v || undefined))}
                    help="Čl. B.5: u zařízení nevyhovujících z hlediska odolnosti nebo výdržného napětí se uvažuje PM = 1."
                  />
                  <button className="btn btn-ghost px-2 py-1.5 text-sm text-bad" onClick={() => setZone(i, (zz) => zz.internalSystems.splice(si, 1))}>
                    Odebrat
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {SYSTEM_PRESETS.map((pr) => (
                  <button
                    key={pr.key}
                    className="btn btn-secondary px-2.5 py-1 text-sm font-normal"
                    title={`${pr.help} ${pr.basis}`}
                    onClick={() =>
                      setZone(i, (zz) => {
                        const line = lines.find((l) => l.service === pr.service && !zz.internalSystems.some((x) => x.lineId === l.id));
                        const sys: InternalSystemInput = { id: `s-${uid()}`, name: pr.label.split(" (")[0], lineId: pr.service === "none" ? null : (line?.id ?? null), ...pr.values };
                        zz.internalSystems.push(sys);
                      })
                    }
                  >
                    + {pr.label}
                  </button>
                ))}
              </div>
            </div>
            {zones.length > 1 && (
              <div className="border-t border-line-soft pt-3">
                <button className="btn btn-ghost px-2.5 py-1 text-sm text-bad" onClick={() => update((d) => calcOf(d).zones!.splice(i, 1))}>
                  Odebrat zónu
                </button>
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" onClick={() => update((d) => (calcOf(d).zones = [...(calcOf(d).zones ?? []), outsideZone()]))}>
          Přidat venkovní zónu
        </button>
        <button
          className="btn btn-secondary"
          onClick={() =>
            update((d) => {
              const z = defaultInsideZone(d.buildingType);
              calcOf(d).zones = [...(calcOf(d).zones ?? []), { ...z, id: `z-${uid()}`, name: "Další vnitřní zóna", persons: 0 }];
            })
          }
        >
          Přidat vnitřní zónu
        </button>
      </div>
      <p className="text-sm text-muted">
        Zóny dělte jen tam, kde se liší ochranná opatření, druh podlahy, požární riziko nebo provoz (např. JIP v nemocnici). Součet osob v zónách by měl odpovídat nt.
      </p>
    </div>
  );
}
