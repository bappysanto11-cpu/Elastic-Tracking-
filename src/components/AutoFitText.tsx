import React, { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';

// Use isomorphic layout effect to prevent SSR warnings
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

let measurementCanvas: HTMLCanvasElement | null = null;
let measurementCtx: CanvasRenderingContext2D | null = null;

/**
 * Synchronously measures text pixel width via an offscreen 2D canvas.
 * Extremely fast (<0.01ms), avoids DOM reflows, and provides immediate font size calculations.
 */
export function measureTextWidth(text: string, fontSize: number, isMono: boolean = false, isBold: boolean = false): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return text.length * fontSize * (isMono ? 0.62 : 0.52);
  }
  try {
    if (!measurementCanvas) {
      measurementCanvas = document.createElement('canvas');
      measurementCtx = measurementCanvas.getContext('2d');
    }
    if (measurementCtx) {
      const fontWeight = isBold ? 'bold ' : 'normal ';
      const fontFamily = isMono 
        ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
        : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      measurementCtx.font = `${fontWeight}${fontSize}px ${fontFamily}`;
      return measurementCtx.measureText(text).width;
    }
  } catch {
    // Fallback if canvas context fails
  }
  return text.length * fontSize * (isMono ? 0.62 : 0.52);
}

export interface AutoFitTextProps {
  /**
   * The text string or number to display and scale
   */
  text: string | number | undefined | null;
  /**
   * Maximum / initial font size in pixels (e.g. 11, 12, 10)
   */
  maxFontSize?: number;
  /**
   * Minimum font size in pixels to scale down to before applying ellipsis (default: 6.5)
   */
  minFontSize?: number;
  /**
   * Whether to treat the text as monospace (affects character width estimations)
   */
  isMono?: boolean;
  /**
   * Whether auto-scaling is enabled. If false, font size stays at maxFontSize.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Additional CSS class names for the inner text element
   */
  className?: string;
  /**
   * Additional inline styles for the inner text element
   */
  style?: React.CSSProperties;
  /**
   * CSS class names for the wrapping container
   */
  containerClassName?: string;
  /**
   * Text alignment within the container
   */
  align?: 'left' | 'right' | 'center';
  /**
   * Optional custom tooltip title. Defaults to the string representation of text.
   */
  title?: string;
  /**
   * Fallback string if text is empty, null, or undefined
   */
  fallback?: string;
  /**
   * Container element tag type
   */
  as?: 'span' | 'div';
}

/**
 * Calculates an instant font size based on canvas measurement or character ratio.
 * This guarantees instant, visually pleasing typography during the initial paint, print preview, and canvas export.
 */
export function calculateHeuristicFontSize(
  text: string,
  maxSize: number,
  minSize: number = 6.5,
  isMono: boolean = false,
  estimatedAvailableWidth: number = 180
): number {
  if (!text || text.length === 0) return maxSize;

  const measuredWidth = measureTextWidth(text, maxSize, isMono, true);

  if (measuredWidth <= estimatedAvailableWidth) {
    return maxSize;
  }

  // Calculate scaled down size to fit available width
  const scale = estimatedAvailableWidth / measuredWidth;
  const targetSize = Math.max(minSize, Math.min(maxSize, maxSize * scale));
  return Math.round(targetSize * 10) / 10;
}

/**
 * AutoFitText component
 * Automatically measures its container and scales down font sizes for fields
 * like 'REF', 'CUSTOMER', or 'BUYER' if entered text exceeds the fixed width
 * of a sticker label card, preventing layout overflow, wrapping, and awkward line breaks.
 */
export const AutoFitText: React.FC<AutoFitTextProps> = ({
  text,
  maxFontSize = 11,
  minFontSize = 6.5,
  isMono = false,
  enabled = true,
  className = '',
  style = {},
  containerClassName = '',
  align = 'left',
  title,
  fallback = '',
  as = 'div',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const displayValue = useMemo(() => {
    if (text !== undefined && text !== null && String(text).trim() !== '') {
      return String(text);
    }
    return fallback;
  }, [text, fallback]);

  // Initial heuristic font size so it renders accurately even before measurement layout phase
  const [fontSize, setFontSize] = useState<number>(() => {
    if (!enabled || !displayValue) return maxFontSize;
    return calculateHeuristicFontSize(displayValue, maxFontSize, minFontSize, isMono);
  });

  const calculateFittedSize = () => {
    if (!enabled || !displayValue) {
      setFontSize(maxFontSize);
      return;
    }

    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    // Use getBoundingClientRect for sub-pixel accuracy, fallback to clientWidth
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width > 0 ? containerRect.width : container.clientWidth;
    
    // If container is hidden or not yet laid out (0 width), do not override heuristic
    if (containerWidth <= 8) return;

    // Get exact text measurement
    const textRect = textEl.getBoundingClientRect();
    const currentTextWidth = Math.max(textRect.width, textEl.scrollWidth);
    if (currentTextWidth <= 0) return;

    // Current active font size
    const currentSize = fontSize > 0 ? fontSize : maxFontSize;
    
    // Calculate accurate unscaled width at maxFontSize
    const unscaledWidth = (currentTextWidth / currentSize) * maxFontSize;

    // 2px safety buffer to prevent subpixel layout wraps or card border clipping
    const availableWidth = Math.max(8, containerWidth - 2);

    if (unscaledWidth > availableWidth) {
      const scale = availableWidth / unscaledWidth;
      const targetSize = Math.max(minFontSize, Math.min(maxFontSize, maxFontSize * scale));
      // Round to 1 decimal place (e.g., 8.2px)
      const rounded = Math.floor(targetSize * 10) / 10;
      setFontSize(rounded);
    } else {
      setFontSize(maxFontSize);
    }
  };

  // Run measurement whenever text or sizing parameters change
  useIsomorphicLayoutEffect(() => {
    calculateFittedSize();
  }, [displayValue, maxFontSize, minFontSize, isMono, enabled]);

  // Responsive observation: recalculate if container size changes (e.g. print layout, compact mode, window resize)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        calculateFittedSize();
      });
      observer.observe(container);
    }

    const handleResize = () => calculateFittedSize();
    window.addEventListener('resize', handleResize);

    // Also recalculate before printing
    let printMatcher: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && window.matchMedia) {
      printMatcher = window.matchMedia('print');
      if (printMatcher.addEventListener) {
        printMatcher.addEventListener('change', handleResize);
      }
    }

    window.addEventListener('beforeprint', handleResize);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeprint', handleResize);
      if (printMatcher && printMatcher.removeEventListener) {
        printMatcher.removeEventListener('change', handleResize);
      }
    };
  }, [displayValue, maxFontSize, minFontSize, isMono, enabled]);

  const alignmentClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const ContainerTag = as;

  return (
    <ContainerTag
      ref={containerRef as any}
      className={`min-w-0 w-full overflow-hidden ${alignmentClass} ${containerClassName}`}
    >
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${className}`}
        style={{
          fontSize: enabled ? `${fontSize}px` : `${maxFontSize}px`,
          lineHeight: 1.2,
          ...style,
        }}
        title={title ?? displayValue}
      >
        {displayValue}
      </span>
    </ContainerTag>
  );
};
