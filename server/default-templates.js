const DEFAULT_TEMPLATES = [
  {
    id: "default-basic",
    name: "기본 템플릿",
    category: "basic",
    builtIn: true,
    description: "가장 안정적인 기본 구성입니다.",
    settings: {
      template: "clean",
      captionStyle: "shadow",
      defaultTransition: "fade",
      photoEffect: "none",
      music: { mood: "none", name: "" },
      outputOptions: { resolution: { mode: "1080x1920", width: 1080, height: 1920 }, fps: 30, quality: "standard", encoder: "auto" }
    }
  },
  {
    id: "default-emotional",
    name: "감동형",
    category: "emotional",
    builtIn: true,
    description: "부드러운 전환과 그림자 자막으로 성장 기록에 어울립니다.",
    settings: {
      template: "ceremony",
      captionStyle: "shadow",
      defaultTransition: "crossfade",
      photoEffect: "slowZoomIn",
      music: { mood: "warm", name: "감동형 BGM 권장" },
      outputOptions: { resolution: { mode: "1080x1920", width: 1080, height: 1920 }, fps: 30, quality: "high", encoder: "auto" }
    }
  },
  {
    id: "default-sports",
    name: "스포츠형",
    category: "sports",
    builtIn: true,
    description: "빠른 리듬과 역동적인 사진 효과 중심입니다.",
    settings: {
      template: "dynamic",
      captionStyle: "bold",
      defaultTransition: "flash",
      photoEffect: "dynamicZoom",
      music: { mood: "active", name: "스포츠형 BGM 권장" },
      outputOptions: { resolution: { mode: "1080x1920", width: 1080, height: 1920 }, fps: 60, quality: "high", encoder: "auto" }
    }
  },
  {
    id: "default-competition",
    name: "대회형",
    category: "competition",
    builtIn: true,
    description: "대회 하이라이트와 결과 기록에 맞춘 구성입니다.",
    settings: {
      template: "dynamic",
      captionStyle: "bold",
      defaultTransition: "zoomIn",
      photoEffect: "slowZoomIn",
      music: { mood: "epic", name: "대회형 BGM 권장" },
      outputOptions: { resolution: { mode: "1920x1080", width: 1920, height: 1080 }, fps: 30, quality: "best", encoder: "auto" }
    }
  },
  {
    id: "default-promotion",
    name: "홍보형",
    category: "promotion",
    builtIn: true,
    description: "도장 홍보 영상과 SNS 쇼츠에 맞춘 세로형 템플릿입니다.",
    settings: {
      template: "social",
      captionStyle: "backdrop",
      defaultTransition: "slideLeft",
      photoEffect: "slowZoomIn",
      music: { mood: "bright", name: "홍보형 BGM 권장" },
      outputOptions: { resolution: { mode: "1080x1920", width: 1080, height: 1920 }, fps: 30, quality: "high", encoder: "auto" }
    }
  },
  {
    id: "default-graduation",
    name: "졸업/승급형",
    category: "graduation",
    builtIn: true,
    description: "승급식, 졸업식, 수료식에 어울리는 차분한 구성입니다.",
    settings: {
      template: "ceremony",
      captionStyle: "shadow",
      defaultTransition: "fade",
      photoEffect: "slowZoomOut",
      music: { mood: "ceremony", name: "졸업/승급형 BGM 권장" },
      outputOptions: { resolution: { mode: "1080x1920", width: 1080, height: 1920 }, fps: 30, quality: "high", encoder: "auto" }
    }
  }
];

module.exports = DEFAULT_TEMPLATES;
