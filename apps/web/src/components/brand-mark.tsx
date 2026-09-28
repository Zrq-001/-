import type { SVGProps } from "react";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M9.5 22.8c0-8 6.5-14.5 14.5-14.5s14.5 6.5 14.5 14.5c0 7.6-5.5 13.7-12.6 14.6l-1.9 5.8-1.9-5.8C15 36.5 9.5 30.4 9.5 22.8Z" fill="#EE6145" />
      <path d="M16.1 23.2c1.7-4.5 4.3-6.7 7.9-6.7s6.2 2.2 7.9 6.7" stroke="#FFF8EC" strokeWidth="3.1" strokeLinecap="round" />
      <path d="M18.7 27.9c1.5 1.6 3.3 2.4 5.3 2.4s3.8-.8 5.3-2.4" stroke="#FFF8EC" strokeWidth="3.1" strokeLinecap="round" />
      <circle cx="18.4" cy="21.7" r="1.55" fill="#FFF8EC" />
      <circle cx="29.6" cy="21.7" r="1.55" fill="#FFF8EC" />
    </svg>
  );
}
