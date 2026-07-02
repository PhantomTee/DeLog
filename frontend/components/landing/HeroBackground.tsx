/**
 * The original spec pointed at a CloudFront URL that belongs to a different
 * product's demo video, not Zamance - so it's deliberately not hardcoded
 * here. Set NEXT_PUBLIC_HERO_VIDEO_URL to a real Zamance-branded video to
 * enable the same full-bleed looping background; until then this renders a
 * gradient in the same palette so the hero still looks intentional.
 */
export function HeroBackground() {
  const videoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;

  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
      {videoUrl ? (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div
          className="absolute inset-0 z-0 h-full w-full"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, rgba(115,66,226,0.16), transparent 55%), radial-gradient(circle at 85% 30%, rgba(115,66,226,0.12), transparent 50%), #F2F2EE",
          }}
        />
      )}
    </div>
  );
}
