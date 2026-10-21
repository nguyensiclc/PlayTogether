// Độ lệch để chữ Hán nằm đúng tâm hình tròn của quân.
// Mỗi hệ điều hành dùng một phông CJK khác nhau nên dy cố định sẽ lệch trên một số máy;
// đo mực chữ thật bằng canvas thì căn đúng với bất kỳ phông nào.

/** Độ lệch tính theo em của cỡ chữ */
export interface GlyphOffset {
  dx: number;
  dy: number;
}

/** Giá trị dự phòng khi không đo được (không có DOM, hoặc phông chưa cho số đo): khớp phông CJK phổ biến */
const FALLBACK_OFFSET: GlyphOffset = { dx: 0, dy: 0.36 };

/** Cỡ chữ khi đo: đủ lớn để số đo không bị làm tròn thô */
const MEASURE_PX = 100;

const cache = new Map<string, GlyphOffset>();
let context: CanvasRenderingContext2D | null | undefined;

function getContext(): CanvasRenderingContext2D | null {
  if (context === undefined) {
    context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  return context;
}

function measure(glyph: string): GlyphOffset | null {
  const ctx = getContext();
  if (!ctx) return null;
  // Cùng phông và độ đậm với chữ trên quân (.ct-svg .pc text), để canvas chọn đúng phông dự phòng
  ctx.font = `700 ${MEASURE_PX}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textAlign = "center";
  const m = ctx.measureText(glyph);
  const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (!(inkHeight > 0)) return null;
  return {
    dx: -(m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 / MEASURE_PX,
    dy: (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 / MEASURE_PX,
  };
}

/** Độ lệch (dx, dy) để tâm mực của `glyph` trùng điểm đặt chữ; có nhớ đệm theo chữ */
export function glyphOffset(glyph: string): GlyphOffset {
  const cached = cache.get(glyph);
  if (cached) return cached;
  const measured = measure(glyph);
  if (!measured) return FALLBACK_OFFSET;
  cache.set(glyph, measured);
  return measured;
}
