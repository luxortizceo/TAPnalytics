import type { MetadataRoute } from "next";

// Lets a client "install" TAPnalytics from their home screen as a real,
// icon-and-splash-screen app (not just a bookmark) — see start_url below,
// which lands them straight in the dashboard, and app/layout.tsx's
// appleWebApp config for the iOS side of the same thing.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAPnalytics",
    short_name: "TAPnalytics",
    description:
      "Captura la experiencia de tus clientes y detecta problemas antes de que se conviertan en malas reseñas.",
    start_url: "/app/dashboard",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
