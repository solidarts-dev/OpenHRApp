// Solid Arts Creativity Studio branding for this deployment (hr.solidarts.co.zw).
// Logos are served from the company website so they stay in sync with solidarts.co.zw.

const WP = 'https://solidarts.co.zw/wp-content/uploads/2025/06';

export const BRAND = {
  companyName: 'Solid Arts Creativity Studio',
  appName: 'Solid Arts HR',
  portalTitle: 'Staff Portal',
  website: 'https://solidarts.co.zw',
  /** White logo, for crimson or dark backgrounds. */
  logoWhite: `${WP}/logo1.png`,
  /** Square brand icon. */
  icon: `${WP}/cropped-solid-arts-icon-270x270.webp`,
  colors: {
    crimson: '#9C0021',
    crimsonDark: '#7A001A',
    navy: '#15212C',
    gold: '#F5A623',
  },
  phone: '+263 77 568 6754',
  email: 'info@solidarts.co.zw',
  address: 'Room 7, 1st Floor, St Andrews House, 40 Samora Machel Ave, Harare',
} as const;
