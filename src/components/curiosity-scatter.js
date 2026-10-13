const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Move the original words, leaving their layout boxes and the trigger in place.
export function scatterWords(copy, trigger, level, previous) {
  if (!copy || !trigger || typeof Element.prototype.animate !== "function")
    return [];
  const words = [...copy.querySelectorAll(".curiosity-word")];
  const starts = words.map((word) => {
    const style = getComputedStyle(word);
    return { transform: style.transform, opacity: style.opacity };
  });
  previous.forEach((animation) => animation.cancel());
  const target = trigger.getBoundingClientRect();
  const center = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };
  const viewportWidth = document.documentElement.clientWidth;
  const compact = viewportWidth < 740;

  return words.map((word, index) => {
    const rect = word.getBoundingClientRect();
    const variation = Math.sin((index + 1) * 13.37);
    const drift = Math.cos((index + 1) * 7.91);
    const x = center.x - (rect.x + rect.width / 2);
    const y = center.y - (rect.y + rect.height / 2);

    if (level === 3) {
      return word.animate(
        [
          { ...starts[index], filter: "blur(0px)" },
          {
            transform: `translate(${x}px, ${y}px) rotate(${variation * 100}deg) scale(0.03)`,
            opacity: 0,
            filter: "blur(3px)",
          },
        ],
        {
          duration: 520,
          easing: "cubic-bezier(.65,0,.9,.4)",
          fill: "forwards",
        },
      );
    }

    const strength = level === 1 ? 1 : 2.8;
    const distance = (compact ? 12 : 22) * strength;
    const rotation = variation * (level === 1 ? 5 : 13);
    // Reserve room for rotation too, so even the narrowest layout cannot widen.
    const margin = 12 + rect.height * 0.25 + rect.width * 0.025;
    const minX = margin - rect.left;
    const maxX = viewportWidth - margin - rect.right;
    const dx = clamp(
      -Math.sign(x || 1) * distance * 0.5 + drift * distance,
      minX,
      maxX,
    );
    const dy = -(16 + (variation + 1) * 11) * strength;
    const floatX = clamp(dx + drift * (compact ? 4 : 9), minX, maxX);
    const transform = (tx, ty, angle) =>
      `translate(${tx}px, ${ty}px) rotate(${angle}deg)`;
    return word.animate(
      [
        { ...starts[index], offset: 0, easing: "cubic-bezier(.16,1,.3,1)" },
        {
          transform: transform(dx, dy, rotation),
          offset: 0.15,
          easing: "ease-in-out",
        },
        {
          transform: transform(floatX, dy - 8, rotation - drift * 3),
          offset: 0.5,
          easing: "ease-in-out",
        },
        {
          transform: transform(dx, dy + 4, rotation + drift * 2),
          offset: 0.78,
          easing: "cubic-bezier(.4,0,.2,1)",
        },
        { transform: "none", opacity: 1, offset: 1 },
      ],
      { duration: 5000, easing: "linear", fill: "forwards" },
    );
  });
}
