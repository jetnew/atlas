import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="shrink-0 font-bold text-xl flex items-center gap-2">
            <Avatar>
              <AvatarImage src="/logo.webp" alt="Atlas" />
            </Avatar>
            Atlas
          </div>
          <div>
            <Button variant="outline">Login</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Your AI Workspace for Knowledge Work
        </h1>
        <p className="mt-6 text-xl text-gray-600">
          The AI-native workspace for knowledge synthesis.
        </p>
        <div className="mt-10">
          <Button size="lg">
            <span className="font-semibold">Start your workspace</span>
            <span className="font-normal"> — it&apos;s free</span>
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            <Avatar className="border-2 border-white">
              <AvatarImage src="/koh-zi-yang.webp" alt="Koh Zi Yang" />
            </Avatar>
            <Avatar className="border-2 border-white">
              <AvatarImage src="/harry-chang.webp" alt="Harry Chang" />
            </Avatar>
            <Avatar className="border-2 border-white">
              <AvatarImage src="/shiying-he.webp" alt="Shiying He" />
            </Avatar>
          </div>
          <p className="text-sm text-gray-600">Loved by thousands globally</p>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-center items-center gap-8">
          <a href="#privacy" className="text-xs text-gray-600 hover:text-gray-900">
            Privacy Policy
          </a>
          <a href="#terms" className="text-xs text-gray-600 hover:text-gray-900">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Dashed Center Fade Grid */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e7e5e4 1px, transparent 1px),
            linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 0",
          maskImage: `
           repeating-linear-gradient(
                  to right,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  to bottom,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
              radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)
          `,
          WebkitMaskImage: `
     repeating-linear-gradient(
                  to right,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  to bottom,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
              radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)
          `,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />
      {/* Your Content/Components */}
      <div className="min-h-screen flex flex-col relative z-10">
        <Navbar />
        <div className="grow flex items-center">
          <Hero />
        </div>
        <Footer />
      </div>
    </div>
  );
}
