import { useEffect, useRef } from "react";

const DotField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const dots = [];
    const spacing = 20;

    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        dots.push({ x, y });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#00f0ff";
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
    />
  );
};

export default DotField;