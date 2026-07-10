import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** Visual height in CSS pixels; width scales from lockup aspect. */
  height?: number;
  priority?: boolean;
};

/** Transparent lockup master aspect (public/brand/srp-logo-lockup.png). */
const LOCKUP_WIDTH = 1361;
const LOCKUP_HEIGHT = 261;

export function BrandLogo({
  className,
  height = 28,
  priority = false,
}: BrandLogoProps) {
  const width = Math.round((height * LOCKUP_WIDTH) / LOCKUP_HEIGHT);

  return (
    <Image
      src="/brand/srp-logo-lockup.png"
      alt="Simple Roster Plus"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

type BrandMarkProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

export function BrandMark({ className, size = 28, priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/brand/srp-icon.png"
      alt="Simple Roster Plus"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
