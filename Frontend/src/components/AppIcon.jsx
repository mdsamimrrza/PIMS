const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const icons = {
  brand: (
    <>
      <path d="M12 4.75a3.25 3.25 0 0 0-3.25 3.25v4.75a3.25 3.25 0 1 0 6.5 0V8A3.25 3.25 0 0 0 12 4.75Z" />
      <path d="M8.75 10.5H6A2.5 2.5 0 0 0 3.5 13v.75A5.75 5.75 0 0 0 9.25 19.5h.5" />
      <path d="M15.25 10.5H18A2.5 2.5 0 0 1 20.5 13v.75a5.75 5.75 0 0 1-5.75 5.75h-.5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.75" y="4.25" width="6.5" height="6.5" />
      <rect x="13.75" y="4.25" width="6.5" height="6.5" />
      <rect x="3.75" y="14.25" width="6.5" height="6.5" />
      <rect x="13.75" y="14.25" width="6.5" height="6.5" />
    </>
  ),
  atc: (
    <>
      <circle cx="10.25" cy="10.25" r="5.75" />
      <path d="m14.25 14.25 5.25 5.25" />
    </>
  ),
  prescription: (
    <>
      <rect x="5" y="3.75" width="14" height="16.5" rx="2" />
      <path d="M9 3.75h6v3H9z" />
      <path d="M8.5 10.25h7" />
      <path d="M8.5 14h7" />
      <path d="M8.5 17.75H13" />
    </>
  ),
  inventory: (
    <>
      <path d="M4.5 8.25 12 4.5l7.5 3.75L12 12 4.5 8.25Z" />
      <path d="M4.5 8.25V16L12 19.5l7.5-3.5V8.25" />
      <path d="M12 12v7.5" />
    </>
  ),
  alert: (
    <>
      <path d="m12 4.25 8.5 15.5H3.5L12 4.25Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.85" fill="currentColor" stroke="none" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  reports: (
    <>
      <path d="M5 19.5V9.25" />
      <path d="M10 19.5V5.75" />
      <path d="M15 19.5V12" />
      <path d="M20 19.5V8.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3.25" />
      <path d="M3.75 18.5a5.25 5.25 0 0 1 10.5 0" />
      <circle cx="17.25" cy="8.25" r="2.5" />
      <path d="M15.25 18.5a4.25 4.25 0 0 1 5-3.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.3 14.2a1 1 0 0 0 .2 1.1l.05.05a1.75 1.75 0 0 1-2.48 2.48l-.05-.05a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.92V19a1.75 1.75 0 0 1-3.5 0v-.08a1 1 0 0 0-.6-.92 1 1 0 0 0-1.1.2l-.05.05a1.75 1.75 0 1 1-2.48-2.48l.05-.05a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H5a1.75 1.75 0 0 1 0-3.5h.08a1 1 0 0 0 .92-.6 1 1 0 0 0-.2-1.1l-.05-.05a1.75 1.75 0 1 1 2.48-2.48l.05.05a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.92V5a1.75 1.75 0 1 1 3.5 0v.08a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.05-.05a1.75 1.75 0 1 1 2.48 2.48l-.05.05a1 1 0 0 0-.2 1.1 1 1 0 0 0 .92.6H19a1.75 1.75 0 0 1 0 3.5h-.08a1 1 0 0 0-.92.6Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4.75H6.75A2.75 2.75 0 0 0 4 7.5v9a2.75 2.75 0 0 0 2.75 2.75H10" />
      <path d="m13.5 16.5 4.5-4.5-4.5-4.5" />
      <path d="M18 12H9" />
    </>
  ),
  bell: (
    <>
      <path d="M7.25 9.25a4.75 4.75 0 0 1 9.5 0v2.1c0 .77.27 1.5.76 2.1l1.24 1.55H5.25l1.24-1.55c.49-.6.76-1.33.76-2.1v-2.1Z" />
      <path d="M10 18.25a2.25 2.25 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.75" />
      <path d="m14.75 14.75 4.75 4.75" />
    </>
  ),
  menu: (
    <>
      <path d="M4.5 7.25h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 16.75h15" />
    </>
  ),
  close: (
    <>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 6.5 6.5 17.5" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6.5 9 5.5 5.5L17.5 9" />,
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  doctor: (
    <>
      <path d="M12 4.5v15" />
      <path d="M7.5 11.25H12" />
      <path d="m12 11.25 3.5-5.75" />
      <path d="m12 11.25 4.5 8.25" />
      <path d="m12 11.25-3.5 5.75" />
    </>
  ),
  pharmacist: (
    <>
      <path d="M8.25 5.25h7.5l2.25 3-6 10.5-6-10.5 2.25-3Z" />
      <path d="M8.5 8.25h7" />
      <path d="M12 12v4" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5 19a7 7 0 0 1 14 0" />
      <path d="M18.5 5.5h2.5" />
      <path d="M19.75 4.25v2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.5" y="5.75" width="15" height="13.75" rx="2" />
      <path d="M8 3.75v4" />
      <path d="M16 3.75v4" />
      <path d="M4.5 9.75h15" />
    </>
  ),
  external: (
    <>
      <path d="M14 5.25h5.25v5.25" />
      <path d="m19.25 5.25-8.5 8.5" />
      <path d="M18.25 12.75v5a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5V7.25a1.5 1.5 0 0 1 1.5-1.5h5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.75" />
    </>
  ),
  note: (
    <>
      <rect x="5" y="4.25" width="14" height="16" rx="2" />
      <path d="M8.5 9h7" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h4.25" />
    </>
  ),
  filter: (
    <>
      <path d="M4.5 5.5h15l-6 7v5l-3-1.8v-3.2l-6-7Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10v5" />
      <circle cx="12" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  arrowRight: <path d="M5.5 12h13M13 6.5l5.5 5.5-5.5 5.5" />,
  shield: (
    <>
      <path d="M12 4.25 18.25 6v4.5c0 4.18-2.72 7.96-6.25 9.25-3.53-1.29-6.25-5.07-6.25-9.25V6L12 4.25Z" />
      <path d="m9.5 12 1.75 1.75L14.75 10" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.25 2.25L15.5 9.5" />
    </>
  ),
  pill: (
    <>
      <path d="M8 7.25a4.75 4.75 0 0 1 6.72 0l2.03 2.03a4.75 4.75 0 1 1-6.72 6.72L8 13.97a4.75 4.75 0 0 1 0-6.72Z" />
      <path d="m9.75 9 5.25 5.25" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 1 2.5 6l-2.5 2" />
      <path d="M3.5 16v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12s4-7.5 9-7.5 9 7.5 9 7.5-4 7.5-9 7.5-9-7.5-9-7.5Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
};

export default function AppIcon({ name, size = 20, className = '' }) {
  const path = icons[name] || icons.note;

  return (
    <span className={`icon ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} {...iconProps}>
        {path}
      </svg>
    </span>
  );
}
