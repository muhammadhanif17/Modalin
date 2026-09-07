/**
 * DIGENERATE dari header tailwind.config di Mockup/*.html — jangan diketik ulang
 * dengan tangan. 25 dari 28 mockup memakai palet Material yang identik; tiga
 * layar publik pertama (Welcome, Pilih Peran, Login) memakai palet brand.*,
 * jadi keduanya hidup berdampingan di sini.
 *
 * Tujuannya supaya markup mockup bisa dipakai nyaris verbatim: class seperti
 * bg-surface-container-lowest, text-label-sm, gap-space-md, dan px-gutter-mobile
 * langsung bekerja tanpa diterjemahkan satu per satu.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
          "fontFamily": {
                "headline-md": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "title-md": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "headline-lg": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "display-lg": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "body-md": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "body-sm": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "label-sm": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "label-md": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "currency-display": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "label-lg": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "headline-sm": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "body-lg": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "display-lg-mobile": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ],
                "sans": [
                      "\"Plus Jakarta Sans\"",
                      "sans-serif"
                ]
          },
          "colors": {
                "surface-container-highest": "#e7e2d7",
                "primary-fixed-dim": "#b4ccbb",
                "on-primary": "#ffffff",
                "on-surface-variant": "#424844",
                "on-secondary-fixed-variant": "#0e5138",
                "outline-variant": "#c2c8c2",
                "on-secondary-fixed": "#002114",
                "error": "#ba1a1a",
                "secondary-container": "#aeeecb",
                "inverse-surface": "#323029",
                "secondary-fixed": "#b1f0ce",
                "on-background": "#1d1c15",
                "on-primary-container": "#768d7e",
                "on-tertiary-container": "#639275",
                "on-error-container": "#93000a",
                "primary": "#000b04",
                "secondary": "#2c694e",
                "on-primary-fixed-variant": "#364c3f",
                "on-tertiary": "#ffffff",
                "surface-variant": "#e7e2d7",
                "surface-dim": "#dedacf",
                "surface-bright": "#fef9ee",
                "on-tertiary-fixed": "#002111",
                "surface-container": "#f2ede2",
                "on-primary-fixed": "#0a2015",
                "surface-container-lowest": "#ffffff",
                "on-error": "#ffffff",
                "on-secondary-container": "#316e52",
                "tertiary-fixed-dim": "#a1d2b2",
                "on-tertiary-fixed-variant": "#224f37",
                "surface-container-high": "#ede8dd",
                "tertiary-fixed": "#bceecd",
                "inverse-on-surface": "#f5f0e5",
                "secondary-fixed-dim": "#95d4b3",
                "on-surface": "#1d1c15",
                "primary-container": "#0f2419",
                "background": "#fef9ee",
                "outline": "#737973",
                "inverse-primary": "#b4ccbb",
                "surface-tint": "#4d6356",
                "surface": "#fef9ee",
                "tertiary-container": "#002614",
                "surface-container-low": "#f8f3e8",
                "tertiary": "#000b04",
                "error-container": "#ffdad6",
                "on-secondary": "#ffffff",
                "primary-fixed": "#d0e9d7",
                "brand": {
                      "forest": "#0F2419",
                      "mint": "#BCEECD",
                      "mint-light": "#E9F9F0",
                      "cream": "#FEF9EE",
                      "card": "#F6F3EB",
                      "muted": "#656A63",
                      "border": "#E8E4D9",
                      "dark": "#141815"
                }
          },
          "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
          },
          "spacing": {
                "space-sm": "0.75rem",
                "space-xs": "0.5rem",
                "space-2xs": "0.25rem",
                "space-2xl": "2rem",
                "space-3xl": "2.5rem",
                "touch-target-min": "3rem",
                "space-xl": "1.5rem",
                "container-max": "75rem",
                "space-4xl": "3.5rem",
                "space-md": "1rem",
                "gutter-desktop": "1.5rem",
                "gutter-mobile": "1rem",
                "space-lg": "1.25rem"
          },
          "fontSize": {
                "headline-md": [
                      "22px",
                      {
                            "lineHeight": "28px",
                            "letterSpacing": "-0.01em",
                            "fontWeight": "700"
                      }
                ],
                "title-md": [
                      "16px",
                      {
                            "lineHeight": "22px",
                            "letterSpacing": "0em",
                            "fontWeight": "600"
                      }
                ],
                "headline-lg": [
                      "28px",
                      {
                            "lineHeight": "36px",
                            "letterSpacing": "-0.015em",
                            "fontWeight": "700"
                      }
                ],
                "display-lg": [
                      "40px",
                      {
                            "lineHeight": "48px",
                            "letterSpacing": "-0.02em",
                            "fontWeight": "800"
                      }
                ],
                "body-md": [
                      "14px",
                      {
                            "lineHeight": "20px",
                            "letterSpacing": "0em",
                            "fontWeight": "400"
                      }
                ],
                "body-sm": [
                      "12px",
                      {
                            "lineHeight": "16px",
                            "letterSpacing": "0.01em",
                            "fontWeight": "400"
                      }
                ],
                "label-sm": [
                      "11px",
                      {
                            "lineHeight": "14px",
                            "letterSpacing": "0.04em",
                            "fontWeight": "700"
                      }
                ],
                "label-md": [
                      "12px",
                      {
                            "lineHeight": "16px",
                            "letterSpacing": "0.02em",
                            "fontWeight": "600"
                      }
                ],
                "currency-display": [
                      "30px",
                      {
                            "lineHeight": "36px",
                            "letterSpacing": "-0.02em",
                            "fontWeight": "700"
                      }
                ],
                "label-lg": [
                      "14px",
                      {
                            "lineHeight": "18px",
                            "letterSpacing": "0.01em",
                            "fontWeight": "600"
                      }
                ],
                "headline-sm": [
                      "18px",
                      {
                            "lineHeight": "24px",
                            "letterSpacing": "-0.005em",
                            "fontWeight": "600"
                      }
                ],
                "body-lg": [
                      "16px",
                      {
                            "lineHeight": "24px",
                            "letterSpacing": "0em",
                            "fontWeight": "400"
                      }
                ],
                "display-lg-mobile": [
                      "32px",
                      {
                            "lineHeight": "40px",
                            "letterSpacing": "-0.02em",
                            "fontWeight": "800"
                      }
                ]
          }
    },
  },
  /*
   * Preflight dimatikan: reset bawaan Tailwind akan menimpa 1.400 baris CSS
   * yang masih menjalankan halaman-halaman yang belum dipindahkan. Dengan
   * begini port bisa dilakukan satu halaman demi satu halaman.
   */
  corePlugins: { preflight: false },
  plugins: [],
};
