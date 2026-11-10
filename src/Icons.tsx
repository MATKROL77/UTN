import type { CSSProperties } from "react";
export type IconName =
  | "orbit"
  | "area"
  | "field"
  | "play"
  | "pause"
  | "reset"
  | "arrow"
  | "upload"
  | "close"
  | "check"
  | "info"
  | "qr"
  | "expand";
const paths: Record<IconName, React.ReactNode> = {
  orbit: (
    <>
      <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-30 12 12)" />
      <circle cx="9" cy="14" r="2" />
      <circle cx="20" cy="7" r="1.5" fill="currentColor" />
    </>
  ),
  area: (
    <>
      <path d="M4 19 8 4a16 16 0 0 1 13 12Z" />
      <path d="m4 19 11-7M4 19l6-12" />
    </>
  ),
  field: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m3 3 4 4M3 7h4V3m14 0-4 4m0-4v4h4M3 21l4-4m-4 0h4v4m14 0-4-4m0 4v-4h4" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" strokeWidth="4" />
    </>
  ),
  reset: (
    <>
      <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  qr: (
    <>
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6v-3m6-6v3" />
    </>
  ),
  expand: (
    <>
      <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />
    </>
  ),
};
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
