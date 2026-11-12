/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 keeps a client-side copy of each visited screen for 30s, so
    // hopping between tabs could show a note list from before your latest
    // recording landed. Always fetch fresh: these screens are cheap to render.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
