"use client";

import { buildingType, SYSTEM_PRESETS } from "@/catalog";
import type { InternalSystemInput, ZoneInput } from "@/core/risk/methodologies/csn-en-62305-2-ed2/schema";
import type { LossType } from "@/core/risk/methodologies/csn-en-62305-2-ed2/tables";
import { defaultInsideZone } from "@/domain/project";
import { fmtNum } from "@/core/util/format";
import { Checkbox, Disclosure, Notice, NumberInput, QuickPicks, SelectInput, TextInput } from "../../ui";
import { LossSelect } from "../loss-select";
import { HZ_OPTIONS, KS3_OPTIONS, LOSS_TABLES, LOSS_TYPE_LABELS, RF_OPTIONS, RT_FLOOR_OPTIONS, UW_OPTIONS } from "../options";
import { calcOf, manual, setProvenance } from "../use-project";
import { issueFor, type StepProps } from "../wizard";

const uid = () => Math.random().toString(36).slice(2, 9);

/** Předvolby doby přítomnosti osob tz (h/rok). */
const TZ_PRESETS: { value: number; label: string; title: string }[] = [
  { value: 8760, label: "Celý rok – 8 760 h", title: "Trvalé bydlení, nepřetržitý provoz (24 h × 365 dní)" },
  { value: 6680, label: "Doma po práci – 6 680 h", title: "Rodinný dům, byt: přítomnost mimo pracovní dobu a o víkendech (8 760 − 2 080 h)" },
  { value: 4160, label: "Dvě směny – 4 160 h", title: "Dvousměnný provoz (16 h × 260 pracovních dní)" },
  { value: 2080, label: "Pracovní doba – 2 080 h", title: "Kancelář, dílna, škola: 8 h × 260 pracovních dní" },
  { value: 1000, label: "Občas – 1 000 h", title: "Chata, sezónní nebo občasný pobyt" },
  { value: 100, label: "Výjimečně – 100 h", title: "Venkovní prostor, sklad, technická místnost s občasnou obsluhou" },
];

const LOSS_TYPE_HELP: Record<LossType, string> = {
  L1: "Úraz nebo smrt osob – posuzuje se u každé budovy.",
  L2: "Výpadek služby pro veřejnost (voda, plyn, elektřina, telekomunikace).",
  L3: "Památky, muzea, galerie.",
  L4: "Majetek, zařízení, ušlý zisk – podle přání investora.",
};

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

  const lossSummary = (z: ZoneInput) => {
    const parts: string[] = [];
    const lv = (v: ZoneInput["l1"]["lf"] | null | undefined, table: (typeof LOSS_TABLES)[keyof typeof LOSS_TABLES]) =>
      v == null ? "–" : v.source === "custom" ? `${fmtNum(v.value)} (vlastní)` : fmtNum((table.rows as Record<string, { value: number }>)[v.key]?.value ?? NaN);
    if (z.location === "outside") {
      // ve venkovní zóně se počítá jen RA → jen LT
      if (lossTypes.L1) parts.push(`L1: LT ${lv(z.l1.lt, LOSS_TABLES.L1_LT)}`);
      if (lossTypes.L4 && z.l4 && options.l4Animals) parts.push(`L4: LT ${lv(z.l4.lt, LOSS_TABLES.L4_LT)}`);
      return parts.join(" · ");
    }
    if (lossTypes.L1) parts.push(`L1: LT ${lv(z.l1.lt, LOSS_TABLES.L1_LT)}, LF ${lv(z.l1.lf, LOSS_TABLES.L1_LF)}${options.l1InternalSystemsEndangerLife ? `, LO ${lv(z.l1.lo, LOSS_TABLES.L1_LO)}` : ""}`);
    if (lossTypes.L2 && z.l2) parts.push(`L2: LF ${lv(z.l2.lf, LOSS_TABLES.L2_LF)}, LO ${lv(z.l2.lo, LOSS_TABLES.L2_LO)}`);
    if (lossTypes.L3 && z.l3) parts.push(`L3: LF ${lv(z.l3.lf, LOSS_TABLES.L3_LF)}`);
    if (lossTypes.L4 && z.l4) parts.push(`L4: LF ${lv(z.l4.lf, LOSS_TABLES.L4_LF)}, LO ${lv(z.l4.lo, LOSS_TABLES.L4_LO)}`);
    return parts.join(" · ");
  };
  const lineName = (id: string | null) => (id ? (lines.find((l) => l.id === id)?.name ?? "neexistující vedení") : "bez vnějšího vedení");

  return (
    <div className="space-y-8">
      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-semibold">Co se hodnotí</legend>
        <p className="text-sm text-ink-soft">Druhy ztrát jsou předvyplněné podle typu objektu ({t.label}). U běžných budov stačí L1, případně L4.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(LOSS_TYPE_LABELS) as LossType[]).map((l) => (
            <Checkbox
              key={l}
              label={LOSS_TYPE_LABELS[l]}
              help={LOSS_TYPE_HELP[l]}
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
            help="Pak se do R1 zahrnují i složky RC, RM, RW, RZ a je nutné zadat ztrátu LO. U běžných budov nechte nezaškrtnuté."
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
        <div className="grid gap-4 sm:grid-cols-2">
          {lossTypes.L1 && (
            <NumberInput
              label="Celkový počet osob v objektu nt"
              value={calc.structure?.totalPersons ?? null}
              onChange={(v) => setRoot((c) => ((c.structure ??= {}).totalPersons = v ?? 0), "calc.structure.totalPersons")}
              error={issueFor(issues, "structure.totalPersons")}
              help={zones.length > 1 ? `Součet osob v zónách: ${fmtNum(zones.reduce((a, z) => a + (z.persons || 0), 0))}` : "U jediné zóny zadejte stejný počet osob i v zóně (nz = nt)."}
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
            <div>
              <SelectInput
                label="Přípustné riziko RT pro L4"
                value={calc.tolerableL4 == null ? "typical" : "custom"}
                onChange={(v) => setRoot((c) => (c.tolerableL4 = v === "typical" ? null : (calc.tolerableL4 ?? 1e-3)), "calc.tolerableL4")}
                options={[
                  { value: "typical", label: "Typická hodnota RT = 0,001 (10⁻³)" },
                  { value: "custom", label: "Vlastní hodnota stanovená investorem" },
                ]}
                help={
                  calc.tolerableL4 == null
                    ? "Doporučeno. Norma pro L4 pevnou hodnotu neuvádí, 10⁻³ je obvyklá hodnota (IEC 62305-2) a porovnání je informativní."
                    : undefined
                }
              />
              {calc.tolerableL4 != null && (
                <div className="mt-2">
                  <NumberInput
                    label="RT pro L4"
                    unit="1/rok"
                    value={calc.tolerableL4}
                    onChange={(v) => setRoot((c) => (c.tolerableL4 = v != null && v > 0 ? v : 1e-3), "calc.tolerableL4")}
                    help="Např. 0,0001 pro přísnější požadavek investora."
                  />
                  <QuickPicks
                    label="Rychlá volba RT"
                    value={calc.tolerableL4}
                    onPick={(v) => setRoot((c) => (c.tolerableL4 = v), "calc.tolerableL4")}
                    options={[
                      { value: 1e-3, label: "10⁻³" },
                      { value: 1e-4, label: "10⁻⁴" },
                      { value: 1e-5, label: "10⁻⁵" },
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </fieldset>

      {zones.map((z, i) => {
        const p = `zones[${i}]`;
        const rfOptions = RF_OPTIONS.filter((o) => !o.value.startsWith("explosion") || t.extraQuestions.includes("explosion") || z.fireRisk.startsWith("explosion"));
        const lossIssue = issues.some((x) => x.path.startsWith(`${p}.l1`) || x.path.startsWith(`${p}.l2`) || x.path.startsWith(`${p}.l3`) || x.path.startsWith(`${p}.l4`));
        const sysIssue = issues.some((x) => x.path.startsWith(`${p}.internalSystems`));
        const outside = z.location === "outside";
        return (
          <fieldset key={z.id} className="panel space-y-5 p-5">
            <legend className="px-1 font-semibold">
              Zóna {i + 1}: {z.name}
            </legend>

            <div className="space-y-4">
              <p className="type-wide text-xs font-bold tracking-wide text-muted uppercase">Osoby a provoz</p>
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
                  <QuickPicks label="Předvolby doby přítomnosti" value={z.hoursPerYear} onPick={(v) => setZone(i, (zz) => (zz.hoursPerYear = v))} options={TZ_PRESETS} />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-line-soft pt-4">
              <p className="type-wide text-xs font-bold tracking-wide text-muted uppercase">{outside ? "Povrch terénu" : "Podlaha a požární riziko"}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput label={outside ? "Povrch terénu (rt)" : "Povrch podlahy (rt)"} value={z.floor} onChange={(v) => setZone(i, (zz) => (zz.floor = v))} options={RT_FLOOR_OPTIONS} />
                {!outside && (
                  <>
                    <SelectInput
                      label="Nebezpečí požáru nebo výbuchu (rf)"
                      value={z.fireRisk}
                      onChange={(v) => setZone(i, (zz) => (zz.fireRisk = v))}
                      options={rfOptions}
                      help="Podle požárně bezpečnostního řešení (měrné požární zatížení), případně dokumentace o ochraně před výbuchem."
                    />
                    <SelectInput label="Zvláštní nebezpečí – panika, evakuace (hz)" value={z.specialHazard} onChange={(v) => setZone(i, (zz) => (zz.specialHazard = v))} options={HZ_OPTIONS} />
                  </>
                )}
              </div>
              {outside && <p className="text-sm text-muted">Ve venkovní zóně se počítá jen úraz osob dotykovým a krokovým napětím (RA). Požár a poruchy systémů se zde neuvažují.</p>}
            </div>

            <Disclosure title="Hodnoty ztrát" summary={`${lossSummary(z)} · převzato z typu objektu, obvykle beze změny`} defaultOpen={lossIssue}>
              <div className="grid gap-4 sm:grid-cols-2">
                {lossTypes.L1 && (
                  <>
                    <LossSelect label="L1: ztráta úrazem LT" table={LOSS_TABLES.L1_LT} value={z.l1.lt} onChange={(v) => setZone(i, (zz) => (zz.l1.lt = v))} />
                    {!outside && (
                      <LossSelect label="L1: ztráta fyzickou škodou LF" table={LOSS_TABLES.L1_LF} value={z.l1.lf} onChange={(v) => setZone(i, (zz) => (zz.l1.lf = v))} error={issueFor(issues, `${p}.l1.lf.note`)} />
                    )}
                    {options.l1InternalSystemsEndangerLife && !outside && (
                      <LossSelect label="L1: ztráta poruchou systémů LO" table={LOSS_TABLES.L1_LO} value={z.l1.lo} onChange={(v) => setZone(i, (zz) => (zz.l1.lo = v))} error={issueFor(issues, `${p}.l1.lo`)} />
                    )}
                  </>
                )}
                {lossTypes.L2 && z.l2 && !outside && (
                  <>
                    <LossSelect label="L2: LF" table={LOSS_TABLES.L2_LF} value={z.l2.lf} onChange={(v) => setZone(i, (zz) => (zz.l2!.lf = v))} />
                    <LossSelect label="L2: LO" table={LOSS_TABLES.L2_LO} value={z.l2.lo} onChange={(v) => setZone(i, (zz) => (zz.l2!.lo = v))} />
                    <NumberInput label="L2: obsluhovaní uživatelé v zóně nz" value={z.l2.servedUsers} onChange={(v) => setZone(i, (zz) => (zz.l2!.servedUsers = v ?? 0))} />
                  </>
                )}
                {lossTypes.L3 && z.l3 && !outside && (
                  <>
                    <LossSelect label="L3: LF" table={LOSS_TABLES.L3_LF} value={z.l3.lf} onChange={(v) => setZone(i, (zz) => (zz.l3!.lf = v))} />
                    <NumberInput label="L3: podíl hodnoty kulturního dědictví v zóně cz/ct" value={z.l3.valueShare} onChange={(v) => setZone(i, (zz) => (zz.l3!.valueShare = v ?? 0))} help="0 až 1" />
                  </>
                )}
                {lossTypes.L4 && z.l4 && (
                  <>
                    {!outside && <LossSelect label="L4: LF" table={LOSS_TABLES.L4_LF} value={z.l4.lf} onChange={(v) => setZone(i, (zz) => (zz.l4!.lf = v))} />}
                    {!outside && <LossSelect label="L4: LO" table={LOSS_TABLES.L4_LO} value={z.l4.lo} onChange={(v) => setZone(i, (zz) => (zz.l4!.lo = v))} />}
                    {options.l4Animals && (
                      <>
                        <LossSelect label="L4: LT (zvířata)" table={LOSS_TABLES.L4_LT} value={z.l4.lt} onChange={(v) => setZone(i, (zz) => (zz.l4!.lt = v))} error={issueFor(issues, `${p}.l4.lt`)} />
                        <NumberInput label="L4: podíl hodnoty zvířat ca/ct" value={z.l4.shareAnimals} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareAnimals = v ?? 0))} help="0 až 1" />
                      </>
                    )}
                    {!outside && (
                      <>
                        <NumberInput label="L4: podíl hodnoty zóny (ca+cb+cc+cs)/ct" value={z.l4.shareTotal} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareTotal = v ?? 0))} help="1 = celá hodnota objektu (konzervativní, nejsou-li údaje)" />
                        <NumberInput label="L4: podíl hodnoty systémů cs/ct" value={z.l4.shareSystems} onChange={(v) => setZone(i, (zz) => (zz.l4!.shareSystems = v ?? 0))} help="0 až 1" />
                      </>
                    )}
                  </>
                )}
              </div>
            </Disclosure>

            {!outside || z.internalSystems.length > 0 ? (
              <div className="space-y-3 border-t border-line-soft pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">Vnitřní systémy v zóně ({z.internalSystems.length})</p>
                  <p className="text-sm text-muted">Systémy k vedením se přidávají automaticky v kroku Přívodní vedení.</p>
                </div>
                {z.internalSystems.length === 0 && <p className="text-sm text-ink-soft">Zóna nemá žádné vnitřní systémy. Přidejte je tlačítky níže nebo přidáním vedení.</p>}
                {z.internalSystems.map((s, si) => (
                  <div key={s.id} className="space-y-3 border border-line-soft p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextInput label="Systém" value={s.name} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].name = v))} />
                      <SelectInput
                        label="Připojené vedení"
                        value={s.lineId ?? "__none"}
                        onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].lineId = v === "__none" ? null : v))}
                        options={[{ value: "__none", label: "bez vnějšího vedení" }, ...lines.map((l) => ({ value: l.id, label: l.name }))]}
                        error={issueFor(issues, `${p}.internalSystems[${si}].lineId`)}
                      />
                      <SelectInput label="Výdržné napětí zařízení UW" value={s.uw} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].uw = v))} options={UW_OPTIONS} help="Běžné spotřebiče 2,5 kV, rozvaděče 4 kV, elektronika 1,5 kV." />
                      <SelectInput label="Vedení vnitřní kabeláže (KS3)" value={s.ks3} onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].ks3 = v))} options={KS3_OPTIONS} />
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Checkbox
                        label="Zařízení nevyhovuje výrobkovým normám (PM = 1)"
                        checked={s.nonCompliant === true}
                        onChange={(v) => setZone(i, (zz) => (zz.internalSystems[si].nonCompliant = v || undefined))}
                        help="Čl. B.5: u zařízení nevyhovujících z hlediska odolnosti nebo výdržného napětí se uvažuje PM = 1."
                      />
                      <button className="btn btn-ghost px-2 py-1 text-sm text-bad" onClick={() => setZone(i, (zz) => zz.internalSystems.splice(si, 1))}>
                        Odebrat systém
                      </button>
                    </div>
                  </div>
                ))}
                <Disclosure title="Přidat vnitřní systém" summary={z.internalSystems.length ? `připojeno: ${Array.from(new Set(z.internalSystems.map((s) => lineName(s.lineId)))).join(", ")}` : undefined} defaultOpen={z.internalSystems.length === 0 || sysIssue}>
                  <p className="text-sm text-ink-soft">
                    Na jedno vedení může být připojeno více systémů – pro složky z vedení se pak bere nejvyšší PSPD a nejnižší UW (čl. 6.9.1), PC a PM se kombinují.
                  </p>
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
                </Disclosure>
              </div>
            ) : null}
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

      <div className="panel space-y-3 p-4">
        <p className="font-semibold">Přidat zónu</p>
        <p className="text-sm text-ink-soft">
          U rodinného domu obvykle stačí jedna vnitřní zóna. Další zónu přidejte jen tam, kde se liší podlaha, požární riziko, ochranná opatření nebo provoz (např. dílna, JIP v nemocnici).
          Venkovní zónu přidejte, pokud se u objektu zdržují osoby (vstup, terasa, hřiště).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            onClick={() =>
              update((d) => {
                const z = defaultInsideZone(d.buildingType);
                calcOf(d).zones = [...(calcOf(d).zones ?? []), { ...z, id: `z-${uid()}`, name: "Další vnitřní zóna", persons: 0 }];
              })
            }
          >
            + Vnitřní zóna
          </button>
          <button className="btn btn-secondary" onClick={() => update((d) => (calcOf(d).zones = [...(calcOf(d).zones ?? []), outsideZone()]))}>
            + Venkovní zóna (do 3 m od svodů)
          </button>
        </div>
        {lossTypes.L1 && zones.length > 1 && <p className="text-sm text-muted">Součet osob v zónách by měl odpovídat celkovému počtu osob nt.</p>}
      </div>
    </div>
  );
}
