// Small direction changes from a trackpad must not make the header flicker.
export function createHeaderScroll() {
  let previous = 0, direction = 0, distance = 0, hidden = false;
  return (scrollY: number, height: number, keepVisible = false) => {
    const top = Math.max(0, scrollY), delta = top - previous;
    previous = top;
    if (delta !== 0) {
      const next = Math.sign(delta);
      distance = next === direction ? distance + Math.abs(delta) : Math.abs(delta);
      direction = next;
    }
    if (keepVisible || top <= height + 12) hidden = false;
    else if (distance >= 8) hidden = direction > 0;
    return { hidden, solid: top > 12 };
  };
}
