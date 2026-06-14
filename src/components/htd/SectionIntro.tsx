import Reveal from "./Reveal";

export default function SectionIntro({
  eyebrow,
  title,
  titleId,
  lede,
  dark = false,
  maxWidth = 720,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  lede?: string;
  dark?: boolean;
  maxWidth?: number;
}) {
  return (
    <Reveal>
      <p className="htd-eyebrow" style={{ color: dark ? "var(--sage)" : "var(--slate)" }}>
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className="htd-h2 mt-5"
        style={{ color: dark ? "var(--bone)" : "var(--ink)", maxWidth }}
      >
        {title}
      </h2>
      {lede && (
        <p
          className="htd-lede mt-6"
          style={{ color: dark ? "var(--sage)" : "var(--slate)", maxWidth }}
        >
          {lede}
        </p>
      )}
    </Reveal>
  );
}
