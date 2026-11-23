import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface Props {
  children: ReactNode;
  /** changes when the active chip changes, so it can be scrolled into view */
  activeKey: string;
}

/**
 * One-line horizontal scroller with < > buttons.
 * Scrolls by: clicking the arrows, hovering the arrows (keeps scrolling),
 * dragging with the mouse, or touch / trackpad swipe. No scrollbar.
 */
export default function ChipScroller({ children, activeKey }: Props) {
  const view = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const auto = useRef({ dir: 0, raf: 0 });
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const update = useCallback(() => {
    const el = view.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  // keep the selected chip visible
  useEffect(() => {
    const el = view.current;
    const chip = el?.querySelector<HTMLElement>(".chip.is-active");
    if (!el || !chip) return;
    el.scrollTo({
      left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeKey]);

  const stopAuto = useCallback(() => {
    auto.current.dir = 0;
    cancelAnimationFrame(auto.current.raf);
  }, []);

  useEffect(() => stopAuto, [stopAuto]);

  const startAuto = (dir: 1 | -1) => {
    stopAuto();
    auto.current.dir = dir;
    const tick = () => {
      const el = view.current;
      if (!el || auto.current.dir === 0) return;
      const atEnd =
        dir === 1 ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 : el.scrollLeft <= 0;
      if (atEnd) return;
      el.scrollLeft += dir * 7;
      auto.current.raf = requestAnimationFrame(tick);
    };
    auto.current.raf = requestAnimationFrame(tick);
  };

  const step = (dir: 1 | -1) => {
    stopAuto();
    view.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const onDown = (e: ReactMouseEvent) => {
    const el = view.current;
    if (!el || e.button !== 0) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onMove = (e: ReactMouseEvent) => {
    const el = view.current;
    const d = drag.current;
    if (!el || !d.down) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5 && !d.moved) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) el.scrollLeft = d.startLeft - dx;
  };

  const endDrag = () => {
    drag.current.down = false;
    setDragging(false);
  };

  const arrow = (dir: 1 | -1, enabled: boolean) => (
    <button
      className="scroller__btn"
      aria-label={dir === 1 ? "Scroll right" : "Scroll left"}
      disabled={!enabled}
      onClick={() => step(dir)}
      onPointerEnter={(e) => e.pointerType === "mouse" && startAuto(dir)}
      onPointerLeave={stopAuto}
    >
      {dir === 1 ? <FaChevronRight /> : <FaChevronLeft />}
    </button>
  );

  return (
    <div className="scroller">
      {arrow(-1, canLeft)}
      <div
        ref={view}
        className={`scroller__view ${dragging ? "is-dragging" : ""}`}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {children}
      </div>
      {arrow(1, canRight)}
    </div>
  );
}
