import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  // Animation stages — same pattern as Login
  const [show, setShow] = useState(false);

  useEffect(() => {
    console.error('404 — attempted to access non-existent route:', location.pathname);
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 overflow-hidden">

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-14px) rotate(3deg); }
        }
        @keyframes drift {
          0%   { transform: translateX(0)   translateY(0)   scale(1);   opacity: 0.4; }
          50%  { transform: translateX(12px) translateY(-8px) scale(1.1); opacity: 0.7; }
          100% { transform: translateX(0)   translateY(0)   scale(1);   opacity: 0.4; }
        }
        .float    { animation: float 4s ease-in-out infinite; }
        .drift-1  { animation: drift 5s ease-in-out infinite; }
        .drift-2  { animation: drift 6.5s ease-in-out infinite 1s; }
        .drift-3  { animation: drift 4.5s ease-in-out infinite 0.5s; }
      `}</style>

      {/* Decorative floating dots */}
      <span className="drift-1 absolute top-[18%] left-[12%]  w-3 h-3 rounded-full bg-primary/20 pointer-events-none" />
      <span className="drift-2 absolute top-[30%] right-[10%] w-5 h-5 rounded-full bg-primary/15 pointer-events-none" />
      <span className="drift-3 absolute bottom-[22%] left-[18%] w-4 h-4 rounded-full bg-primary/10 pointer-events-none" />
      <span className="drift-1 absolute bottom-[15%] right-[15%] w-2 h-2 rounded-full bg-primary/25 pointer-events-none" />

      <div
        className="text-center max-w-sm w-full"
        style={{
          opacity:   show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Floating icon */}
        <div className="float inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 mb-6 shadow-sm">
          <Sprout className="text-primary" size={44} strokeWidth={1.5} />
        </div>

        {/* 404 number */}
        <h1
          className="font-black text-primary mb-2 leading-none"
          style={{
            fontSize: 'clamp(5rem, 20vw, 7rem)',
            opacity:   show ? 1 : 0,
            transform: show ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s',
          }}
        >
          404
        </h1>

        {/* Message */}
        <div
          style={{
            opacity:   show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
          }}
        >
          <p className="text-xl font-bold text-foreground mb-1">
            Page Not Found
          </p>
          <p className="text-sm text-muted-foreground mb-1">
            Looks like this field hasn't been planted yet.
          </p>
          <p className="text-xs text-muted-foreground/60 font-mono bg-muted px-3 py-1.5 rounded-lg inline-block mt-1 mb-7">
            {location.pathname}
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity:   show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s',
          }}
        >
          <Button
            onClick={() => navigate('/')}
            className="h-12 px-8 font-bold shadow-md gap-2"
          >
            <Home size={18} />
            Return to Home
          </Button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;