const DEFAULT_FACILITY_ID = "pkm-jagakarsa";

const FACILITY_MAPS = {
  "pkm-jagakarsa": {
    q: "PUSKESMAS KECAMATAN JAGAKARASA, Jakarta Selatan",
    placeId: "ChIJS7JbYn_uaS4R6E4MCNb0w30",
    supportsDirectReview: true,
  },
  "pustu-tanjungbarat": {
    q: "Puskesmas Tanjung Barat, Jakarta Selatan",
    placeId: "ChIJLT_m2IjtaS4RB0sHFY8j0KI",
    supportsDirectReview: true,
  },
  "pustu-srengsengsawah": {
    q: "Puskesmas Pembantu Srengseng Sawah, Jakarta Selatan",
    placeId: "ChIJaSqhiRzvaS4RQo8FMv98JRQ",
    supportsDirectReview: true,
  },
  "pustu-ciganjur": {
    q: "Puskesmas Pembantu Ciganjur, Jakarta Selatan",
    placeId: "ChIJU_yjbGPuaS4RpBSozGg8cdk",
    supportsDirectReview: true,
  },
  "pustu-lentengagung1": {
    q: "Puskesmas Kelurahan Lenteng Agung 1, Jakarta Selatan",
    placeId: "ChIJG7hq5cPtaS4R7r4cJtZMPFA",
    supportsDirectReview: true,
  },
  "pustu-lentengagung2": {
    q: "Puskesmas Kelurahan Lenteng Agung 2, Jakarta Selatan",
    placeId: "ChIJu0YkBaHtaS4RPlGNuJKnMMc",
    supportsDirectReview: true,
  },
  "pustu-jagakarsa1": {
    q: "Puskesmas Kelurahan Jagakarsa, Jakarta Selatan",
    placeId: "ChIJa7s6RtjtaS4RZ_bLfIC-iRI",
    supportsDirectReview: true,
  },
  "pustu-jagakarsa2": {
    q: "Puskesmas Kelurahan Jagakarsa II, Jakarta Selatan",
    placeId: "ChIJZc1NWgXyaS4REQfStgT5oHQ",
    supportsDirectReview: true,
  },
};

function getFacilityMap(facilityId) {
  return FACILITY_MAPS[facilityId] || FACILITY_MAPS[DEFAULT_FACILITY_ID];
}

export function mapEmbedSrc(facilityId) {
  const item = getFacilityMap(facilityId);
  return `https://www.google.com/maps?q=${encodeURIComponent(item.q)}&output=embed`;
}

export function reviewLink(facilityId) {
  const item = getFacilityMap(facilityId);
  const query = encodeURIComponent((item.q || "").trim());
  const placeId = (item.placeId || "").trim();

  if (item.supportsDirectReview && placeId) {
    return `https://search.google.com/local/writereview?placeid=${placeId}&hl=id`;
  }

  if (placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
