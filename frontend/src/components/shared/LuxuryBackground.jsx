import React, { useEffect, useRef } from 'react';

export default function LuxuryBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    const symbols = ['⬡', '◈', '⊕', '✧', '✦'];
    let mouse = { x: null, y: null, radius: 160 };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 12 + 10;
        this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
        this.density = Math.random() * 20 + 10;
        this.opacity = Math.random() * 0.15 + 0.05;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
      }

      draw() {
        ctx.fillStyle = `rgba(168, 85, 247, ${this.opacity})`; // Soft purple glow matching Stash palette
        ctx.font = `${this.size}px sans-serif`;
        ctx.fillText(this.symbol, this.x, this.y);
      }

      update() {
        // Drift gently in anti-gravity motion
        this.x += this.vx;
        this.y += this.vy;

        // Wrap screen edges
        if (this.x < -20) this.x = canvas.width + 20;
        if (this.x > canvas.width + 20) this.x = -20;
        if (this.y < -20) this.y = canvas.height + 20;
        if (this.y > canvas.height + 20) this.y = -20;

        // Repel from cursor position (anti-gravity field force)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * this.density * 0.5;
            const directionY = forceDirectionY * force * this.density * 0.5;

            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }
    }

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 22000);
      for (let i = 0; i < Math.min(count, 80); i++) {
        particles.push(new Particle());
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Initial setup
    handleResize();

    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.draw();
        particle.update();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <style>{`
        .aurora-container {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #f6f8fb; /* Light mode fallback background */
          pointer-events: none;
          transition: background 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Ambient aurora glows */
        .aurora-mesh {
          position: absolute;
          width: 180%;
          height: 180%;
          top: -40%;
          left: -40%;
          background:
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 40%, rgba(219, 39, 119, 0.06) 0%, transparent 45%),
            radial-gradient(circle at 40% 70%, rgba(20, 184, 166, 0.04) 0%, transparent 35%);
          filter: blur(120px);
          animation: auroraOrbit 40s infinite alternate ease-in-out;
        }

        @keyframes auroraOrbit {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(20deg) scale(1.1); }
          100% { transform: rotate(40deg) scale(1); }
        }

        #particle-canvas {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
      `}</style>

      <div className="aurora-container">
        <div className="aurora-mesh"></div>
      </div>
      <canvas id="particle-canvas" ref={canvasRef}></canvas>
    </>
  );
}
