import { useEffect, useState } from "react";

const colors = [
  "from-primary to-primary-glow",
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
];

export function AnimatedFooter() {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-16 py-8 border-t">
      <div className="container mx-auto px-4 text-center">
        <div
          className={`inline-block bg-gradient-to-r ${colors[colorIndex]} bg-clip-text text-transparent transition-all duration-1000 font-bold text-lg animate-fade-in`}
        >
          Created by Benson M. Maina
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          © {new Date().getFullYear()} NoteDown. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
