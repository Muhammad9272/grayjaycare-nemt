type IconProps = { className?: string };

function base(paths: React.ReactNode) {
  return function Icon({ className = "h-5 w-5" }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = base(<path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />);

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c.7-3.4 3.4-5.5 6.5-5.5s5.8 2.1 6.5 5.5" />
    <path d="M16 8.2a3.2 3.2 0 1 1 3.6 3.17" />
    <path d="M14.8 14.6c2.6.3 4.7 2.2 5.2 5.4" />
  </>,
);

export const TruckIcon = base(
  <>
    <path d="M2.5 6.5h10a1 1 0 0 1 1 1V16h-11V6.5Z" />
    <path d="M13.5 10h3.8l3.2 3.2V16h-2" />
    <circle cx="6.5" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </>,
);

export const ListIcon = base(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1" fill="currentColor" />
    <circle cx="3.5" cy="12" r="1" fill="currentColor" />
    <circle cx="3.5" cy="18" r="1" fill="currentColor" />
  </>,
);

export const DollarIcon = base(
  <>
    <path d="M12 2.5v19M17 6.8c0-1.8-2-3.1-5-3.1S7 5 7 6.8s2.2 2.7 5 3.2c2.8.5 5 1.4 5 3.2S15 16.3 12 16.3s-5-1.3-5-3.1" />
  </>,
);

export const BuildingIcon = base(
  <>
    <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21" />
    <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
    <path d="M3 21h18" />
    <path d="M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1" />
  </>,
);

export const ClockIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.3 2" />
  </>,
);

export const PlusIcon = base(<path d="M12 5v14M5 12h14" />);

export const CarIcon = base(
  <>
    <path d="M3.5 13.5 5 8.8a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8.8l1.5 4.7" />
    <path d="M2.5 13.5h19V17a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-.5H5.7V17a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-3.5Z" />
    <circle cx="7" cy="17.5" r="1.4" />
    <circle cx="17" cy="17.5" r="1.4" />
  </>,
);

export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </>,
);

export const MenuIcon = base(<path d="M4 6h16M4 12h16M4 18h16" />);

export const XIcon = base(<path d="M6 6l12 12M18 6 6 18" />);

export const FileTextIcon = base(
  <>
    <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8.5L14 3Z" />
    <path d="M13.5 3v4.5a1 1 0 0 0 1 1H19" />
    <path d="M8.5 13h7M8.5 16.5h7" />
  </>,
);
