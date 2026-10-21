import type { SVGProps } from 'react';

const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  phone: <path d="M5 4h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></>,
  send: <path d="M20.5 3.5 3.5 10.6l6.4 2.6 2.6 6.4zM9.9 13.2l4.4-4.4" />,
  doc: <><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" transform="translate(-1 0)" /><path d="M13 3.5V8h4.5M9 12.5h6M9 16h6" transform="translate(-1 0)" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5S9.5 6.1 12 3.5z" /></>,
  landmark: <><path d="M3.5 9.5 12 4l8.5 5.5z" /><path d="M5.5 10v7.5M9.8 10v7.5M14.2 10v7.5M18.5 10v7.5M3.5 20h17" /></>,
  truck: <><path d="M3.5 6.5h10v10h-10zM13.5 10h4l3 3.2v3.3h-7" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  scale: <><path d="M12 4v16M7 20h10M5 8h14" /><path d="m5 8-2.5 6a2.5 2.5 0 0 0 5 0zM19 8l-2.5 6a2.5 2.5 0 0 0 5 0z" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.6v.1" /></>,
  alert: <><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17v.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" /></>,
  note: <><path d="M5 4.5h14v10l-5 5H5z" /><path d="M14 19.5v-5h5M8 9h8M8 12.5h5" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="1.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  trash: <><path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13" /></>,
  box: <><path d="M4 8 12 4l8 4v8.5L12 20.5 4 16.5z" /><path d="m4 8 8 4 8-4M12 12v8.5" /></>,
  reset: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
  sparkle: <path d="M12 4c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />,
  telegram: <path d="m20.5 4.5-17 6.6 5.3 1.9 1.9 5.9 3-3.6 4.6 3.4zM8.8 13l8.7-5.6-6.6 7.1" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
