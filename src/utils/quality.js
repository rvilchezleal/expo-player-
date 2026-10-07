const QUALITY_NAMES = { 2160: '4K', 1440: 'Quad HD', 1080: 'Full HD', 720: 'HD', 480: 'SD', 360: 'Baja', 240: 'Muy baja' };

export function buildQualityOptions(heights) {
  return [
    {
      key: 'auto',
      label: 'Automática',
      sublabel: heights.length === 1 ? 'El stream solo trae una calidad' : 'Se ajusta según tu conexión',
    },
    ...heights.map((h) => ({ key: String(h), label: `${h}p`, sublabel: QUALITY_NAMES[h] ?? '' })),
  ];
}
