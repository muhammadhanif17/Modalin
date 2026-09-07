import { useEffect, useRef, useState } from 'react';

/**
 * Papan tanda tangan berbasis kanvas.
 *
 * ARCHITECTURE.md §2.1 mensyaratkan tanda tangan bisa dibubuhkan langsung dari
 * layar sentuh tanpa aplikasi tambahan, jadi ini pointer-events (mendukung
 * jari, stylus, dan mouse sekaligus) — bukan unggah berkas gambar.
 */
export function SignaturePad({
  onChange,
  height = 180,
}: {
  onChange: (blob: Blob | null) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Kanvas digambar pada resolusi perangkat supaya garisnya tidak buram di HP.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16241D';
  }, [height]);

  const pointOf = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => onChange(blob), 'image/png');
  };

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointOf(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointOf(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!dirty.current) {
      dirty.current = true;
      setEmpty(false);
    }
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) emit();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <canvas
        ref={canvasRef}
        className="sign-pad"
        style={{ height }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        aria-label="Area tanda tangan"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="field-hint" style={{ flex: 1, marginTop: 0 }}>
          {empty ? 'Bubuhkan tanda tanganmu di kotak di atas.' : 'Tanda tangan siap.'}
        </span>
        <button type="button" className="btn btn-soft btn-sm" onClick={clear} disabled={empty}>
          Ulangi
        </button>
      </div>
    </div>
  );
}
