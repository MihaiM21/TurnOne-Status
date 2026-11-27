const DIGITS = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";

/**
 * Digit-by-digit rolling number. Each digit is a vertical strip of 0-9 moved with
 * translateY when the value changes; everything else ("." "%" " ms") stays static.
 * Digits are keyed by place value (counted from the right) so they roll in place,
 * and Geist Mono's tabular figures keep the width stable.
 */
export function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  const chars = [...value];
  const n = chars.length;
  return (
    <span className={`num ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="roll">
        {chars.map((ch, i) => {
          const key = n - i;
          if (ch >= "0" && ch <= "9") {
            return (
              <span key={key} className="roll-digit">
                <span className="roll-strip" style={{ transform: `translateY(${Number(ch) * -1.2}em)` }}>
                  {DIGITS}
                </span>
              </span>
            );
          }
          return (
            <span key={key} className="roll-char">
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}
