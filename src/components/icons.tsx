import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = { fill: 'currentColor', 'aria-hidden': true, focusable: false } as const

export const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.6V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.6V13h2.7v8h3.2z" />
  </svg>
)
export const InstagramIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden focusable={false} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
  </svg>
)
export const TwitterIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M21.5 6.6c-.7.3-1.4.5-2.1.6.8-.5 1.3-1.2 1.6-2-.7.4-1.5.7-2.3.9a3.7 3.7 0 0 0-6.3 3.4C9.3 9.3 6.5 7.800 4.700 5.500a3.700 3.700 0 0 0 1.100 4.900c-.600 0-1.100-.2-1.700-.5 0 1.800 1.300 3.300 3 3.700-.5.100-1.100.200-1.700.100.500 1.500 1.900 2.600 3.500 2.600A7.400 7.400 0 0 1 3 17.800 10.500 10.500 0 0 0 8.700 19.500c6.800 0 10.500-5.700 10.500-10.600v-.5c.8-.5 1.600-1.200 2.300-1.800z" />
  </svg>
)
export const LinkedinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5.100 9h3.300v10.500H5.100V9zM6.700 3.700a1.900 1.900 0 1 1 0 3.800 1.900 1.900 0 0 1 0-3.800zM10.400 9h3.100v1.400h.1c.4-.8 1.500-1.700 3.100-1.700 3.300 0 3.900 2.200 3.900 5v5.800h-3.300v-5.100c0-1.200 0-2.800-1.700-2.800s-2 1.300-2 2.700v5.200h-3.300V9z" />
  </svg>
)
export const YoutubeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M21.600 7.200a2.500 2.500 0 0 0-1.800-1.800C18.200 5 12 5 12 5s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 7.200C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 0 0 1.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800c.4-1.600.4-4.800.4-4.800s0-3.200-.4-4.800zM10 15V9l5.200 3L10 15z" />
  </svg>
)
export const MessageIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7.500 8 6 8-6" />
  </svg>
)
export const ScanIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
  </svg>
)
