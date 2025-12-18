import { Button } from "@/components/ui/button";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="shrink-0 font-bold text-xl">
            Atlas
          </div>
          <div className="flex-1 flex justify-center">
            <a href="#features" className="text-gray-700 hover:text-gray-900 px-3 py-2">
              Features
            </a>
          </div>
          <div>
            <Button>Start Workspace</Button>
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
          <Button size="lg">Start your workspace — it&apos;s free</Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white"></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white"></div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white"></div>
          </div>
          <p className="text-sm text-gray-600">Loved by thousands globally</p>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center">
          <div className="font-bold text-xl">
            Atlas
          </div>
          <div className="flex gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#privacy" className="text-gray-600 hover:text-gray-900">
              Privacy Policy
            </a>
            <a href="#terms" className="text-gray-600 hover:text-gray-900">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Hero />
      </div>
      <Footer />
    </div>
  );
}
