function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeAiPhoto(photo = {}, index = 0) {
  return {
    id: String(photo.id || `photo-${index + 1}`),
    fileName: String(photo.fileName || photo.name || `photo-${index + 1}`),
    width: Number(photo.width || 0),
    height: Number(photo.height || 0),
    size: Number(photo.size || photo.fileSize || 0),
    brightness: Number(photo.brightness || 0),
    sharpness: Number(photo.sharpness || 0),
    colorfulness: Number(photo.colorfulness || 0),
    duplicateKey: String(photo.duplicateKey || ""),
    selected: photo.selected !== false,
    favorite: Boolean(photo.favorite),
    locked: Boolean(photo.locked),
    rating: Number(photo.rating || 3),
    students: Array.isArray(photo.students) ? photo.students : [],
    order: Number(photo.order || index)
  };
}

function analyzeAiPhotos(rawPhotos = []) {
  const photosForDuplicate = rawPhotos.map(normalizeAiPhoto);
  const duplicateFirstByKey = new Map();
  for (const photo of photosForDuplicate) {
    const key = photo.duplicateKey || `${photo.fileName}-${photo.size}`;
    if (!duplicateFirstByKey.has(key)) duplicateFirstByKey.set(key, photo.id);
  }

  return photosForDuplicate.map((photo, index) => {
    const reasons = [];
    const excludeReasons = [];
    const portraitBonus = photo.height > photo.width ? 8 : 0;
    const groupBonus = photo.students.length >= 2 ? 5 : 0;
    const favoriteBonus = photo.favorite ? 10 : 0;
    const ratingBonus = (photo.rating - 3) * 6;
    const brightnessPenalty = photo.brightness < 35 ? 24 : photo.brightness < 50 ? 10 : 0;
    const darkPenalty = photo.brightness < 35 ? 1 : 0;
    const blurPenalty = photo.sharpness < 14 ? 24 : photo.sharpness < 24 ? 10 : 0;
    const duplicateKey = photo.duplicateKey || `${photo.fileName}-${photo.size}`;
    const duplicate = duplicateFirstByKey.get(duplicateKey) !== photo.id;
    const duplicatePenalty = duplicate ? 30 : 0;
    const lowSizePenalty = photo.size && photo.size < 60 * 1024 ? 8 : 0;
    let score = 72 + portraitBonus + groupBonus + favoriteBonus + ratingBonus - brightnessPenalty - blurPenalty - duplicatePenalty - lowSizePenalty;

    if (photo.height > photo.width) reasons.push("세로 사진 우선");
    if (photo.students.length >= 2) reasons.push("단체 장면 후보");
    if (photo.favorite) reasons.push("즐겨찾기 반영");
    if (photo.rating >= 4) reasons.push("높은 별점");
    if (photo.brightness < 35) excludeReasons.push("너무 어두움");
    if (photo.sharpness < 14) excludeReasons.push("흐림/흔들림 의심");
    if (duplicate) excludeReasons.push("중복 사진");
    if (lowSizePenalty) excludeReasons.push("낮은 해상도/용량 의심");

    const excluded = !photo.locked && (darkPenalty || photo.sharpness < 14 || duplicate);
    if (photo.locked) {
      score = Math.max(score, 65);
      reasons.push("잠금 장면 유지");
    }

    return {
      id: photo.id,
      fileName: photo.fileName,
      score: clampScore(score),
      recommended: photo.locked || (!excluded && score >= 55),
      excluded: Boolean(excluded),
      reasons: reasons.length ? reasons : ["기본 품질 통과"],
      excludeReasons,
      metrics: {
        brightness: Math.round(photo.brightness),
        sharpness: Math.round(photo.sharpness),
        colorfulness: Math.round(photo.colorfulness),
        duplicate
      }
    };
  });
}

function createStoryboardFromAnalysis(rawPhotos = [], analysis = [], mode = "promotion") {
  const analysisById = new Map(analysis.map(item => [item.id, item]));
  const normalizedPhotos = rawPhotos.map(normalizeAiPhoto);
  const locked = normalizedPhotos.filter(photo => photo.locked);
  const candidates = normalizedPhotos
    .filter(photo => !photo.locked)
    .map(photo => ({ photo, analysis: analysisById.get(photo.id) }))
    .filter(item => item.analysis?.recommended)
    .sort((a, b) => (b.analysis.score - a.analysis.score) || (a.photo.order - b.photo.order));
  const ordered = [];
  const used = new Set();
  for (const photo of locked.sort((a, b) => a.order - b.order)) {
    ordered.push({ photo, analysis: analysisById.get(photo.id), role: "locked" });
    used.add(photo.id);
  }
  const roles = ["openingActivity", "activity", "group", "highlight", "endingScene"];
  for (const [index, item] of candidates.entries()) {
    if (used.has(item.photo.id)) continue;
    const isGroup = item.photo.students.length >= 2;
    const role = isGroup ? "group" : roles[Math.min(index, roles.length - 1)] || "activity";
    ordered.push({ ...item, role });
    used.add(item.photo.id);
  }
  ordered.sort((a, b) => {
    if (a.role === "locked" && b.role === "locked") return a.photo.order - b.photo.order;
    if (a.role === "locked") return a.photo.order - b.photo.order;
    if (b.role === "locked") return a.photo.order - b.photo.order;
    return (b.analysis?.score || 0) - (a.analysis?.score || 0);
  });

  const captionSets = {
    promotion: {
      opening: "오늘도 성장하는 우리 도장의 빛나는 순간",
      activity: "힘차게 도전하는 태권도 수업",
      group: "함께해서 더 멋진 우리 아이들",
      highlight: "오늘의 하이라이트",
      ending: "아이들의 성장을 Highlight Studio가 기록합니다"
    },
    emotional: {
      opening: "작은 도전이 큰 자신감이 되는 시간",
      activity: "땀방울마다 담긴 노력",
      group: "함께 웃고 함께 성장했습니다",
      highlight: "가장 빛났던 순간",
      ending: "오늘의 추억을 오래 간직합니다"
    },
    competition: {
      opening: "대회를 향한 뜨거운 도전",
      activity: "집중력과 실력을 보여준 순간",
      group: "팀워크로 완성한 무대",
      highlight: "승부의 하이라이트",
      ending: "도전은 다음 무대로 이어집니다"
    },
    classRecord: {
      opening: "오늘의 수업 기록",
      activity: "기본기와 집중 훈련",
      group: "친구들과 함께한 활동",
      highlight: "수업 속 성장 포인트",
      ending: "다음 수업도 기대해 주세요"
    }
  };
  const captions = captionSets[mode] || captionSets.promotion;
  const scenes = [
    { type: "opening", title: "오프닝", caption: captions.opening },
    ...ordered.map((item, index) => {
      const sceneType = item.role === "group" ? "group" : index >= Math.max(0, ordered.length - 2) ? "highlight" : "activity";
      return {
        type: sceneType,
        title: sceneType === "group" ? "단체 장면" : sceneType === "highlight" ? "하이라이트" : "활동 장면",
        photoId: item.photo.id,
        score: item.analysis?.score || 0,
        caption: captions[sceneType],
        duration: Math.max(2, Math.min(5, Math.round(2 + ((item.analysis?.score || 60) - 50) / 25)))
      };
    }),
    { type: "ending", title: "엔딩", caption: captions.ending }
  ];
  return {
    mode,
    selectedPhotoIds: ordered.map(item => item.photo.id),
    excludedPhotoIds: analysis.filter(item => item.excluded).map(item => item.id),
    scenes
  };
}

module.exports = {
  clampScore,
  normalizeAiPhoto,
  analyzeAiPhotos,
  createStoryboardFromAnalysis
};
