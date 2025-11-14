import React from 'react';

export const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
      d="M12 8v4l2.5 2.5M4.5 9.75a7.5 7.5 0 111.567 4.58"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 5.25v4.5h4.5"
    />
  </svg>
);

