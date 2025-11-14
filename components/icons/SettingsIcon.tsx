import React from 'react';

export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6h3m-1.5 3.75A2.25 2.25 0 1014.25 12 2.25 2.25 0 0012 9.75zm0 0V6m0 7.5v4.5m-3 0h6"
    />
  </svg>
);

