import { nextTick, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue';

export interface AutoFitTableOptions<Row> {
  getHeaders: () => string[];
  getRowValues: (row: Row) => string[];
  getRows: () => Row[];
  modeEnabled?: () => boolean;
  safetyGapPx?: number;
  minColPx?: number;
  padXByCol?: number[];
  watchDeps?: () => unknown[];
}

export const useAutoFitTable = <Row>(
  containerRef: Ref<HTMLElement | null>,
  tableRef: Ref<HTMLTableElement | null>,
  options: AutoFitTableOptions<Row>
) => {
  const scale = ref(1);
  const targetWidth = ref<number | null>(null);
  const colWidths = ref<number[]>([]);

  let ro: ResizeObserver | null = null;
  let measureCanvas: HTMLCanvasElement | null = null;

  const measureTextPx = (text: string, font: string): number => {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (!ctx) return text.length * 10;
    ctx.font = font;
    return ctx.measureText(text).width;
  };

  const update = async () => {
    if (options.modeEnabled && !options.modeEnabled()) return;
    await nextTick();

    const containerEl = containerRef.value;
    const tableEl = tableRef.value;
    if (!containerEl || !tableEl) return;

    const safety = options.safetyGapPx ?? 8;
    const availableWidth = Math.max(0, containerEl.clientWidth - safety * 2);
    if (availableWidth <= 0) return;

    const cs = window.getComputedStyle(tableEl);
    const font = cs.font || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

    const headers = options.getHeaders();
    const cols = headers.length;
    const minColPx = options.minColPx ?? 56;
    const padXByCol = options.padXByCol ?? [];

    const required = new Array<number>(cols).fill(0);

    for (let i = 0; i < cols; i += 1) {
      const padX = padXByCol[i] ?? 28;
      required[i] = Math.max(required[i], Math.ceil(measureTextPx(headers[i] ?? '', font) + padX));
    }

    const rows = options.getRows();
    for (const r of rows) {
      const values = options.getRowValues(r);
      for (let i = 0; i < cols; i += 1) {
        const padX = padXByCol[i] ?? 28;
        required[i] = Math.max(required[i], Math.ceil(measureTextPx(values[i] ?? '', font) + padX));
      }
    }

    for (let i = 0; i < cols; i += 1) {
      required[i] = Math.max(required[i], minColPx);
    }

    const sumRequired = required.reduce((s, w) => s + w, 0);
    if (sumRequired > availableWidth) {
      const finalWidths = required.map(w => Math.floor(w));
      const finalSum = finalWidths.reduce((s, w) => s + w, 0);
      colWidths.value = finalWidths;
      targetWidth.value = finalSum;
      scale.value = finalSum > availableWidth ? availableWidth / finalSum : 1;
      return;
    }

    const base = availableWidth / cols;
    const widths = new Array<number>(cols).fill(base);
    for (let i = 0; i < cols; i += 1) {
      widths[i] = Math.max(widths[i], required[i]);
    }

    let sumWidths = widths.reduce((s, w) => s + w, 0);
    let overflow = sumWidths - availableWidth;

    if (overflow > 0.5) {
      const slack = widths.map((w, i) => Math.max(0, w - required[i]));
      const slackTotal = slack.reduce((s, w) => s + w, 0);
      if (slackTotal > 0) {
        for (let i = 0; i < cols; i += 1) {
          if (slack[i] <= 0) continue;
          const take = overflow * (slack[i] / slackTotal);
          widths[i] = Math.max(required[i], widths[i] - take);
        }
      }
    }

    sumWidths = widths.reduce((s, w) => s + w, 0);
    const remaining = availableWidth - sumWidths;
    if (remaining > 0.5) {
      const per = remaining / cols;
      for (let i = 0; i < cols; i += 1) widths[i] += per;
    }

    const finalWidths = widths.map(w => Math.floor(w));
    let finalSum = finalWidths.reduce((s, w) => s + w, 0);
    let drift = Math.round(availableWidth - finalSum);

    for (let i = 0; i < cols && drift !== 0; i += 1) {
      if (drift > 0) {
        finalWidths[i] += 1;
        drift -= 1;
      } else if (drift < 0 && finalWidths[i] > required[i]) {
        finalWidths[i] -= 1;
        drift += 1;
      }
    }

    finalSum = finalWidths.reduce((s, w) => s + w, 0);
    colWidths.value = finalWidths;
    targetWidth.value = finalSum;
    scale.value = 1;
  };

  onMounted(() => {
    const containerEl = containerRef.value;
    if (!containerEl || typeof ResizeObserver === 'undefined') return;
    ro = new ResizeObserver(() => void update());
    ro.observe(containerEl);
  });

  onBeforeUnmount(() => {
    ro?.disconnect();
    ro = null;
  });

  watch(
    () => (options.watchDeps ? options.watchDeps() : []),
    () => {
      void update();
    },
    { flush: 'post' }
  );

  return {
    scale,
    targetWidth,
    colWidths,
    update,
  };
};
