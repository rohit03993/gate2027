import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GATE CS 2027",
    short_name: "GATE 2027",
    description: "Office-week study log for GATE CS 2027",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#4d7c6f",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
