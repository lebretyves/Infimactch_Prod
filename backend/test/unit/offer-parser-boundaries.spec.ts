import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOffer,
  parserInputHash,
  currentParsedOffer,
} from "../../src/public-data/offer-parser";
import { parseOfferV2, fold } from "../../src/public-data/parser/legacy-v2";
import { parseOfferV3 } from "../../src/public-data/parser/legacy-v3";
const fields = (description: string) =>
  parseOfferV3({ description }).fields as Array<{
    field: string;
    value: any;
    state: string;
    origin: string;
    evidence: string;
  }>;
const field = (description: string, key: string) =>
  fields(description).find((f) => f.field === key);

test("legacy API provenance remains distinct from source evidence and reports inconsistent imports", () => {
  const r = parseOfferV2({
    title: "IBODE de nuit",
    source: "JOBSPIPE",
    location_label: "Ville fictive",
    description:
      "CDI. Expérience de trois ans. DE infirmier de bloc serait un plus.",
    provenance: {
      salaryRaw: { amount: 30 },
      facts: {
        contract: { code: "MIS" },
        experience: { label: "2 ans" },
        workingTime: "journée",
        education: ["DE"],
        skills: [],
        location: { coordinates: [2, 48] },
      },
    },
  });
  assert.deepEqual(
    new Set(r.alerts),
    new Set([
      "EXPERIENCE_API_TEXTE_DIVERGENTE",
      "CONTRAT_IMPORT_TEXTE_DIVERGENT",
      "IBODE_TITRE_MAIS_DIPLOME_SOUHAITE_DANS_TEXTE",
      "HORAIRES_API_TEXTE_A_RECONCILIER",
    ]),
  );
  assert.equal(
    r.fields.find((f: any) => f.field === "api_contrat").origin,
    "NORMALISATION_EXISTANTE",
  );
  assert.equal(
    r.fields.find((f: any) => f.field === "api_lieu").origin,
    "PROVENANCE_STOCKEE",
  );
  assert.ok(!r.fields.some((f: any) => f.field === "api_competences"));
  assert.ok(r.fields.some((f: any) => f.field === "api_coordonnees"));
});

test("legacy titles classify anesthetists and ignore recruitment boilerplate contracts", () => {
  const r = parseOfferV2({
    title: "Infirmier anesthésiste",
    description:
      "Notre cabinet accompagne le recrutement CDD/CDI. Une phrase inconnue.",
  });
  assert.ok(
    r.fields.some(
      (f: any) => f.field === "qualification_titre" && f.value === "IADE",
    ),
  );
  assert.ok(r.fields.some((f: any) => f.field === "contexte_recruteur"));
  assert.ok(!r.fields.some((f: any) => f.field === "contrat_texte"));
  assert.ok(r.unclassified.includes("Une phrase inconnue"));
  assert.equal(fold(null), "");
  assert.equal(fold("ÉTÉ"), "ete");
});

test("experience units, minimums and unquantified experience are retained without inventing years", () => {
  for (const [text, amount, unit] of [
    ["Expérience minimale de deux ans", 2, "ANS"],
    ["Expérience de 6 mois appréciée", 6, "MOIS"],
    ["Expérience de cinq années", 5, "ANS"],
  ] as const) {
    const f = field(text, "experience_duree");
    assert.deepEqual(f?.value, { amount, unit });
  }
  assert.equal(
    field("Expérience minimale de deux ans", "experience_duree")?.state,
    "EXIGENCE_TEXTE",
  );
  assert.equal(
    field("Expérience de 6 mois appréciée", "experience_duree")?.state,
    "SOUHAITE",
  );
  assert.ok(field("Expérience souhaitée", "experience_non_chiffree"));
});

test("conditional equipment, negated skills and desired alternatives remain distinct", () => {
  assert.equal(
    field("Selon équipement, robot assistée", "equipement")?.state,
    "CONDITIONNEL",
  );
  assert.equal(field("Sans prélèvements", "competence")?.state, "NEGATION");
  assert.equal(
    field("DIUST ou AFOMETRA apprécié", "alternatives_professionnelles")?.state,
    "ALTERNATIVES_PAS_CUMUL",
  );
  assert.ok(!fields("Gestion des urgences").some((f) => f.field === "service"));
  assert.ok(
    fields("Expérience en pneumologie").some(
      (f) => f.field === "experience_domaine" && f.value === "PNEUMOLOGIE",
    ),
  );
  assert.equal(
    field("Sans ventilation mécanique", "competence")?.state,
    "NEGATION",
  );
});

test("legacy contract exclusions and explicit duration preserve uncertainty", () => {
  assert.ok(
    !fields("Mission CDI en parallèle").some(
      (f) => f.field === "contrat_texte",
    ),
  );
  assert.equal(field("Mission vacation", "contrat_texte")?.value, "VACATION");
  assert.deepEqual(field("Durée : 3 semaines", "duree_mission")?.value, {
    amount: 3,
    unit: "semaines",
  });
  assert.equal(
    field("Début immédiatement", "debut_mission")?.value,
    "DES_QUE_POSSIBLE",
  );
  assert.ok(field("Dates : mois de septembre", "periode_texte"));
  assert.equal(field("Débutants motivés", "debutant_accepte")?.value, true);
});

test("shift quantities reject impossible percentages and preserve planning evidence", () => {
  assert.equal(field("Poste à 80 %", "quotite_pct")?.value, 80);
  assert.ok(!field("Poste à 120 %", "quotite_pct"));
  assert.equal(
    field("Poste de jour ou nuit", "alternance")?.value,
    "JOUR_NUIT",
  );
  assert.equal(
    field("Poste de jour et de nuit", "alternance")?.value,
    "JOUR_NUIT",
  );
  assert.equal(field("Sans astreinte", "garde_astreinte")?.state, "NEGATION");
  assert.equal(
    field("Amplitude 8h à 20h", "horaires_detail")?.state,
    "AMPLITUDE_PAS_DUREE_POSTE",
  );
  assert.ok(field("Mission 8h ou 12h", "durees_poste_alternatives"));
  assert.ok(field("Disponibilités 3 jours fériés", "contraintes_planning"));
  assert.ok(field("Déplacements entre sites indispensables", "mobilite"));
  assert.equal(
    field("Équipe de 4 infirmiers", "charge_et_equipe")?.state,
    "CONTEXTE_PAS_POSTES_A_POURVOIR",
  );
});

test("transport activity and patient care context are not benefits or assignment services", () => {
  assert.ok(field("Transport médicalisé", "activite_transport_sanitaire"));
  assert.ok(!field("Transport médicalisé", "avantage"));
  assert.equal(
    field("Transport médicalisé avec remboursement", "avantage")?.value,
    "TRANSPORT",
  );
  assert.ok(
    field("Soins avant le passage au bloc opératoire", "contexte_parcours"),
  );
  assert.equal(
    field("Anglais, autres langues appréciées", "langue")?.state,
    "MENTION_A_CONFIRMER",
  );
  assert.ok(field("Prime de nuit", "majoration_horaire"));
  assert.ok(field("Poste de nuit avec prime", "horaire_type"));
});

test("advance payments distinguish unknown frequency from explicit schedules", () => {
  assert.deepEqual(field("Acompte disponible", "acompte")?.value, {
    frequency: null,
  });
  assert.deepEqual(field("Acompte 2 fois par semaine", "acompte")?.value, {
    frequency: 2,
    period: "semaine",
  });
  assert.deepEqual(field("Acompte 1 fois par mois", "acompte")?.value, {
    frequency: 1,
    period: "mois",
  });
});

test("allowances keep ambiguous grouped rates and optional reimbursement periods", () => {
  assert.deepEqual(
    field("Prime 10 % et congés payés 12,5 %", "taux_avantages")?.value,
    { rates: [10, 12.5], assignment: "A_CONFIRMER_PAR_COMPOSANTE" },
  );
  assert.deepEqual(
    field("Indemnité repas 8 euros par repas", "montant_avantage")?.value,
    { amount: 8, currency: "EUR", period: "repas" },
  );
  assert.deepEqual(
    field("Indemnité transport 3,50 euros", "montant_avantage")?.value,
    { amount: 3.5, currency: "EUR", period: null },
  );
  assert.ok(!field("Prime salaire 2000 euros", "montant_avantage"));
});

test("break durations never imply paid time and notices remain explicit", () => {
  for (const [text, minutes] of [
    ["30 minutes de pause", 30],
    ["1h30 de pause", 90],
    ["2 heures de pause", 120],
  ] as const) {
    const f = field(text, "pause_minutes");
    assert.equal(f?.value, minutes);
    assert.equal(f?.state, "PAIEMENT_NON_DEDUIT");
  }
  assert.equal(
    field("Planning 4 jours par semaine", "jours_travailles_semaine")?.value,
    4,
  );
  assert.equal(field("Mission en 12h", "duree_poste_heures")?.value, 12);
  assert.ok(!field("Mission en 25h", "duree_poste_heures"));
  assert.deepEqual(
    field("2 à 4 disponibilités par 1,5 mois", "disponibilites_a_declarer")
      ?.value,
    { min: 2, max: 4, noticeMonths: 1.5 },
  );
  assert.equal(
    field("Expérience requise selon Valletoux", "condition_experience")?.state,
    "CONDITION_A_VERIFIER_NON_APPLIQUEE",
  );
});

test("incomplete supplier dates and damaged descriptions remain visible alerts", () => {
  const r = parseOfferV3({
    description:
      "Dates à compléter. Le texte s’est perdu. Temps plein. Temps partiel.",
  });
  assert.ok(r.alerts.includes("DATES_FOURNISSEUR_A_COMPLETER"));
  assert.ok(r.alerts.includes("DESCRIPTION_DEGRADEE"));
  assert.ok(r.alerts.includes("TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE"));
  assert.equal(
    field("Salaire selon convention", "remuneration_non_chiffree")?.value,
    true,
  );
  assert.ok(
    !field("CNIL données personnelles 1000 euros", "salaire_structure"),
  );
});

test("current parser distinguishes permit requirement, software and dated evidence", () => {
  for (const [text, state] of [
    ["Permis B indispensable", "REQUIRED"],
    ["Sans permis B", "NEGATED"],
    ["Permis B apprécié", "MENTION"],
  ] as const) {
    const f = parseOffer({ description: text }).fields.find(
      (f) => f.key === "permis",
    );
    assert.equal(f?.state, state);
  }
  const r = parseOffer({
    description:
      "Logiciel Orbis. Mission du 01/10/2026 au 02/10/2026. Lundi et mardi.",
  });
  assert.ok(r.fields.some((f) => f.key === "logiciel"));
  assert.ok(
    r.fields.some(
      (f) => f.key === "dates_mission" && f.state === "REVIEW_REQUIRED",
    ),
  );
  assert.deepEqual(r.fields.find((f) => f.key === "jours_nommes")?.value, [
    "lundi",
    "mardi",
  ]);
});

test("salary amounts retain hourly, monthly, annual and unknown units with gross uncertainty", () => {
  for (const [description, amount, unit, gross] of [
    ["Salaire horaire 25,50 euros brut", 25.5, "HOUR", true],
    ["Salaire mensuel 2 500 euros net", 2500, "MONTH", false],
    ["Rémunération annuelle 40k euros", 40000, "YEAR", null],
    ["Salaire 400 euros", 400, null, null],
  ] as const) {
    const f = parseOffer({ description }).fields.find(
      (f) => f.key === "salaire_structure",
    );
    assert.deepEqual(f?.value, { amount, currency: "EUR", unit, gross });
    assert.equal(f?.state, "REVIEW_REQUIRED");
  }
});

test("hash canonicalization retains array order, ignores provider name and invalidates altered evidence", () => {
  assert.equal(
    parserInputHash({}),
    parserInputHash({ title: "", description: "", qualification: null }),
  );
  assert.equal(
    parserInputHash({ source: "A" }),
    parserInputHash({ source: "B" }),
  );
  assert.notEqual(
    parserInputHash({ provenance: { facts: { skills: ["a", "b"] } } }),
    parserInputHash({ provenance: { facts: { skills: ["b", "a"] } } }),
  );
  assert.equal(currentParsedOffer({}), null);
  const row = { description: "Permis B" };
  const parsed_offer = parseOffer(row, "2026-09-22T00:00:00.000Z");
  assert.equal(currentParsedOffer({ ...row, parsed_offer }), parsed_offer);
  assert.equal(
    currentParsedOffer({ ...row, qualification: "IDE", parsed_offer }),
    null,
  );
});
