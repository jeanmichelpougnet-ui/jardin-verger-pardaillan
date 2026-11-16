/**
 * iNaturalist API — Jardin-Verger de Pardaillan (tout en français)
 */
const INAT = {
  base: 'https://api.inaturalist.org/v1',
  projectId: 'jardin-verger-de-pardaillan',
  projectNumericId: 296270,
  placeId: 234878,
  locale: 'fr',
  preferredPlaceId: 6753, // France
};

/** Libellés français des groupes iconiques */
const GROUPES_FR = {
  Insecta: { label: 'Insectes', icon: '🐛', desc: 'Abeilles, papillons, coccinelles… essentiels dans le jardin.' },
  Plantae: { label: 'Plantes', icon: '🌿', desc: 'Fleurs, arbres, herbes du verger.' },
  Fungi: { label: 'Champignons', icon: '🍄', desc: 'Champignons et moisissures du sol et du bois.' },
  Aves: { label: 'Oiseaux', icon: '🐦', desc: 'Oiseaux du jardin et des haies.' },
  Mammalia: { label: 'Mammifères', icon: '🦊', desc: 'Mammifères observés sur le site.' },
  Amphibia: { label: 'Amphibiens', icon: '🐸', desc: 'Grenouilles, crapauds et salamandres.' },
  Reptilia: { label: 'Reptiles', icon: '🦎', desc: 'Lézards et serpents.' },
  Arachnida: { label: 'Araignées', icon: '🕷️', desc: 'Araignées et opilions.' },
  Mollusca: { label: 'Mollusques', icon: '🐌', desc: 'Escargots et limaces.' },
  Actinopterygii: { label: 'Poissons', icon: '🐟', desc: 'Poissons.' },
  Animalia: { label: 'Animaux', icon: '🐾', desc: 'Animaux du jardin.' },
  Protozoa: { label: 'Protozoaires', icon: '🔬', desc: 'Micro-organismes.' },
  Chromista: { label: 'Chromistes', icon: '🌊', desc: 'Algues et apparentés.' },
  Unknown: { label: 'Autres', icon: '❔', desc: 'Autres observations.' },
};

const RANK_FR = {
  stateofmatter: 'Domaine',
  kingdom: 'Règne',
  phylum: 'Embranchement',
  subphylum: 'Sous-embranchement',
  class: 'Classe',
  subclass: 'Sous-classe',
  order: 'Ordre',
  suborder: 'Sous-ordre',
  superfamily: 'Super-famille',
  family: 'Famille',
  subfamily: 'Sous-famille',
  tribe: 'Tribu',
  genus: 'Genre',
  subgenus: 'Sous-genre',
  species: 'Espèce',
  subspecies: 'Sous-espèce',
  variety: 'Variété',
  form: 'Forme',
  complex: 'Complexe',
  hybrid: 'Hybride',
};

async function inatFetch(path, params = {}) {
  const url = new URL(`${INAT.base}${path}`);
  // Toujours demander le français
  const defaults = {
    locale: INAT.locale,
    preferred_place_id: INAT.preferredPlaceId,
  };
  const all = { ...defaults, ...params };
  Object.entries(all).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function getProjectStats() {
  const [obs, species, research, needsId, observers] = await Promise.all([
    inatFetch('/observations', { project_id: INAT.projectId, per_page: 0 }),
    inatFetch('/observations/species_counts', { project_id: INAT.projectId, per_page: 1 }),
    inatFetch('/observations', { project_id: INAT.projectId, quality_grade: 'research', per_page: 0 }),
    inatFetch('/observations', { project_id: INAT.projectId, quality_grade: 'needs_id', per_page: 0 }),
    inatFetch('/observations/observers', { project_id: INAT.projectId }),
  ]);
  return {
    totalObs: obs.total_results,
    totalSpecies: species.total_results,
    researchGrade: research.total_results,
    needsId: needsId.total_results,
    observers: observers.total_results,
    observerList: observers.results || [],
  };
}

async function getRecentObservations(limit = 8) {
  const data = await inatFetch('/observations', {
    project_id: INAT.projectId,
    per_page: limit,
    order: 'desc',
    order_by: 'observed_on',
    photos: true,
  });
  return data.results || [];
}

async function getIconicCounts() {
  const keys = Object.keys(GROUPES_FR);
  const results = await Promise.all(
    keys.map(async (key) => {
      if (key === 'Unknown') return null;
      const d = await inatFetch('/observations', {
        project_id: INAT.projectId,
        iconic_taxa: key,
        per_page: 0,
      });
      const meta = GROUPES_FR[key];
      return { key, label: meta.label, icon: meta.icon, desc: meta.desc, count: d.total_results };
    })
  );
  return results.filter((g) => g && g.count > 0);
}

async function getSpeciesCounts(limit = 30) {
  const data = await inatFetch('/observations/species_counts', {
    project_id: INAT.projectId,
    per_page: limit,
  });
  return data.results || [];
}

async function getObservationsByTaxon(taxonId, limit = 20) {
  return inatFetch('/observations', {
    project_id: INAT.projectId,
    taxon_id: taxonId,
    per_page: limit,
    order_by: 'observed_on',
  });
}

async function getTaxon(id) {
  const data = await inatFetch(`/taxa/${id}`);
  return data.results?.[0] || null;
}

async function getMonthlyHistogram(year = 2026) {
  const data = await inatFetch('/observations/histogram', {
    project_id: INAT.projectId,
    date_field: 'observed',
    interval: 'month',
    d1: `${year}-01-01`,
    d2: `${year}-12-31`,
  });
  return data.results?.month || {};
}

/** Placeholder SVG (illustration feuille) si aucune photo */
const PLACEHOLDER_IMG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8f0e0"/><stop offset="100%" stop-color="#d4e4c4"/>
    </linearGradient></defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <g transform="translate(320 220)" fill="none" stroke="#5c820d" stroke-width="6" opacity="0.45">
      <ellipse cx="0" cy="0" rx="70" ry="110" transform="rotate(-25)"/>
      <path d="M0 100 L0 -90"/>
    </g>
    <text x="320" y="380" text-anchor="middle" fill="#5c820d" font-family="system-ui,sans-serif" font-size="22" opacity="0.7">Pas de photo</text>
  </svg>`
);

/**
 * Construit une URL photo fiable à partir d'un objet photo iNaturalist.
 * Préfère medium > square > large > url réécrite.
 */
function buildPhotoUrl(photo, size = 'medium') {
  if (!photo) return null;
  if (size === 'medium' && photo.medium_url) return photo.medium_url;
  if (size === 'large' && (photo.large_url || photo.medium_url)) return photo.large_url || photo.medium_url;
  if (size === 'square' && photo.square_url) return photo.square_url;
  if (photo.square_url && size === 'medium') {
    return photo.square_url.replace('/square.', '/medium.').replace('/square.', '/medium.');
  }
  const raw = photo.url || photo.square_url || photo.medium_url || photo.large_url;
  if (!raw) return null;
  // Remplacer la taille dans le chemin (.../square.jpg → .../medium.jpg)
  return raw
    .replace(/\/(square|small|medium|large|original)\./, `/${size}.`)
    .replace(/\/(square|small|medium|large|original)\./, `/${size}.`);
}

/** Photo d'une observation (1re photo) ou du taxon */
function photoUrl(obs, size = 'medium') {
  if (!obs) return null;
  const fromObs = obs.photos && obs.photos[0];
  const fromTaxon = obs.taxon && obs.taxon.default_photo;
  return buildPhotoUrl(fromObs, size) || buildPhotoUrl(fromTaxon, size);
}

/** Photo d'un taxon (espèce) */
function taxonPhoto(taxon, size = 'medium') {
  if (!taxon) return null;
  return buildPhotoUrl(taxon.default_photo, size);
}

/** URL utilisable dans <img>, avec illustration de secours */
function photoOrPlaceholder(url) {
  return url || PLACEHOLDER_IMG;
}

/**
 * Nom vernaculaire en français (locale=fr sur l'API).
 * Ne pas utiliser english_common_name.
 */
function commonName(taxon) {
  if (!taxon) return 'Inconnu';
  // preferred_common_name est en FR grâce à locale=fr
  if (taxon.preferred_common_name) return taxon.preferred_common_name;
  // Parfois les noms sont dans taxon_names
  if (Array.isArray(taxon.names)) {
    const fr = taxon.names.find(
      (n) => n.locale === 'fr' || n.lexicon === 'french' || n.lexicon === 'French'
    );
    if (fr?.name) return fr.name;
  }
  // Fallback : nom scientifique uniquement (pas d'anglais)
  return taxon.name;
}

function groupeLabel(iconicName) {
  return GROUPES_FR[iconicName]?.label || iconicName || 'Autre';
}

function rankLabel(rank) {
  return RANK_FR[rank] || rank || '';
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}



/** Récupère des photos d'observations du projet pour enrichir les fiches sans image */
async function enrichSpeciesPhotos(speciesList, maxFetch = 40) {
  try {
    const data = await inatFetch('/observations', {
      project_id: INAT.projectId,
      per_page: maxFetch,
      photos: true,
      order_by: 'observed_on',
      order: 'desc',
    });
    const byTaxon = {};
    for (const obs of (data.results || [])) {
      const tid = obs.taxon?.id;
      if (!tid || byTaxon[tid]) continue;
      const u = photoUrl(obs, 'medium');
      if (u) byTaxon[tid] = u;
    }
    return speciesList.map((s) => {
      const t = s.taxon;
      const existing = taxonPhoto(t, 'medium');
      const fallback = byTaxon[t?.id];
      return {
        ...s,
        photoUrl: existing || fallback || null,
      };
    });
  } catch (e) {
    console.warn('enrich photos', e);
    return speciesList.map((s) => ({
      ...s,
      photoUrl: taxonPhoto(s.taxon, 'medium'),
    }));
  }
}

window.INAT_API = {
  INAT,
  GROUPES_FR,
  RANK_FR,
  getProjectStats,
  getRecentObservations,
  getIconicCounts,
  getSpeciesCounts,
  getObservationsByTaxon,
  getTaxon,
  getMonthlyHistogram,
  photoUrl,
  taxonPhoto,
  buildPhotoUrl,
  photoOrPlaceholder,
  PLACEHOLDER_IMG,
  enrichSpeciesPhotos,
  commonName,
  groupeLabel,
  rankLabel,
  formatDate,
  escapeHtml,
  inatFetch,
};
