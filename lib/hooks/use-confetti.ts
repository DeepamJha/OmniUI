import { useEffect, useCallback } from 'react';

export function useConfetti() {
    const trigger = useCallback(() => {
        // Create canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);

        // Confetti particles
        const particles: any[] = [];
        const particleCount = 50;
        const gravity = 0.3;
        const resistance = 0.98;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            rotation: number;
            vrotation: number;
            life: number;

            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = -20;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = Math.random() * 5 + 3;
                this.size = Math.random() * 8 + 4;
                const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.rotation = Math.random() * Math.PI * 2;
                this.vrotation = (Math.random() - 0.5) * 0.3;
                this.life = 1;
            }

            update() {
                this.vy += gravity;
                this.vx *= resistance;
                this.vy *= resistance;
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.vrotation;
                this.life -= 0.015;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                ctx.restore();
            }
        }

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Animation loop
        function animate() {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw(ctx);

                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(canvas);
            }
        }

        animate();
    }, []);

    return { trigger };
}
