/**
 * Client-only: capture a DOM node to PNG.
 * Flattens Tailwind v4 lab()/oklch() via computed rgb() styles for html2canvas.
 */
export async function captureElementToPng(el: HTMLElement): Promise<string> {
  const wrapper = el.parentElement;
  const prevWrapperClass = wrapper?.getAttribute("class") ?? null;
  const moved =
    wrapper &&
    (wrapper.classList.contains("fixed") || wrapper.style.position === "fixed");

  // If parked off-screen, briefly show for layout (manager capture path).
  if (wrapper && moved) {
    wrapper.setAttribute(
      "class",
      "pointer-events-none fixed left-0 top-0 z-[-1] opacity-[0.01]",
    );
  }

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const { default: html2canvas } = await import("html2canvas");
    const width = Math.max(el.scrollWidth, el.offsetWidth, 1);
    const height = Math.max(el.scrollHeight, el.offsetHeight, 1);

    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: height,
      width,
      height,
      foreignObjectRendering: true,
      onclone: (doc, cloned) => {
        const originals = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))];
        const clones = [cloned, ...Array.from(cloned.querySelectorAll<HTMLElement>("*"))];
        const n = Math.min(originals.length, clones.length);
        for (let i = 0; i < n; i++) {
          const orig = originals[i]!;
          const clone = clones[i]!;
          const cs = window.getComputedStyle(orig);
          clone.style.cssText = "";
          clone.style.boxSizing = cs.boxSizing;
          clone.style.backgroundColor = cs.backgroundColor;
          clone.style.color = cs.color;
          clone.style.borderTop = `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`;
          clone.style.borderRight = `${cs.borderRightWidth} ${cs.borderRightStyle} ${cs.borderRightColor}`;
          clone.style.borderBottom = `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`;
          clone.style.borderLeft = `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`;
          clone.style.borderRadius = cs.borderRadius;
          clone.style.font = cs.font;
          clone.style.fontSize = cs.fontSize;
          clone.style.fontWeight = cs.fontWeight;
          clone.style.fontFamily = cs.fontFamily;
          clone.style.lineHeight = cs.lineHeight;
          clone.style.textAlign = cs.textAlign;
          clone.style.textTransform = cs.textTransform;
          clone.style.whiteSpace = cs.whiteSpace;
          clone.style.padding = cs.padding;
          clone.style.margin = cs.margin;
          clone.style.display = cs.display;
          clone.style.flexDirection = cs.flexDirection;
          clone.style.flexWrap = cs.flexWrap;
          clone.style.alignItems = cs.alignItems;
          clone.style.justifyContent = cs.justifyContent;
          clone.style.gap = cs.gap;
          clone.style.width = cs.width;
          clone.style.minWidth = cs.minWidth;
          clone.style.height = cs.height;
          clone.style.minHeight = cs.minHeight;
          clone.style.overflow = "visible";
          clone.style.verticalAlign = cs.verticalAlign;
          clone.style.tableLayout = cs.tableLayout;
          clone.style.borderCollapse = cs.borderCollapse;
          clone.style.boxShadow = "none";
          clone.style.textShadow = "none";
          clone.style.backgroundImage = "none";
          clone.style.filter = "none";
          if (cs.position === "sticky" || cs.position === "fixed") {
            clone.style.position = "static";
          } else {
            clone.style.position = cs.position;
          }
          clone.removeAttribute("class");
        }
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("Captured image was empty.");
    }
    return canvas.toDataURL("image/png");
  } finally {
    if (wrapper && moved) {
      if (prevWrapperClass == null) wrapper.removeAttribute("class");
      else wrapper.setAttribute("class", prevWrapperClass);
    }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
