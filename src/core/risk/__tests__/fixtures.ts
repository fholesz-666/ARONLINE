import type { Ed2Input } from "../methodologies/csn-en-62305-2-ed2/schema";

/** Rodinný dům – jednoduchý vstup pro testy (hodnoty nejsou z normy, slouží jen k testování). */
export function familyHouse(): Ed2Input {
  return {
    structure: {
      L: 15,
      W: 10,
      H: 8,
      prominentHeight: null,
      cd: "surrounded_same_or_lower",
      lps: "none",
      totalPersons: 4,
      totalServedUsers: null,
    },
    lightning: { mode: "ng", ng: 2.5, td: null, source: "test" },
    lossTypes: { L1: true, L2: false, L3: false, L4: false },
    options: { l1InternalSystemsEndangerLife: false, l4Animals: false },
    tolerableL4: null,
    lines: [
      {
        id: "nn",
        name: "NN přípojka",
        service: "power",
        installation: "buried",
        lineType: "lv_tlc",
        environment: "suburban",
        lengthM: null,
        shielding: "buried_unshielded",
        shieldResistance: null,
        peb: "none",
        adjacentStructure: null,
      },
    ],
    zones: [
      {
        id: "z2",
        name: "Vnitřek domu",
        location: "inside",
        persons: 4,
        hoursPerYear: 8760,
        floor: "asphalt_linoleum_wood",
        pta: ["none"],
        ptu: "none",
        fireRisk: "fire_ordinary",
        fireProvisions: "none",
        specialHazard: "none",
        l1: { lt: { source: "table", key: "all" }, lf: { source: "table", key: "other" }, lo: null },
        l2: null,
        l3: null,
        l4: null,
        shieldExternal: { wm: null, continuous: false },
        shieldInternal: { wm: null, continuous: false },
        internalSystems: [
          { id: "s1", name: "Silnoproudá instalace", lineId: "nn", uw: "2.5", ks3: "unshielded_no_precaution", pspd: "none" },
        ],
      },
    ],
  };
}
