import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface MeasureOverlayProps {
  isActive: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const distance = (a: Point, b: Point) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getImagePoint = (event: React.MouseEvent<HTMLDivElement>, image: HTMLImageElement | null): Point | null => {
  if (!image || !image.naturalWidth || !image.naturalHeight) return null;

  const frameRect = event.currentTarget.getBoundingClientRect();
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const frameAspect = frameRect.width / frameRect.height;
  const renderedWidth = imageAspect > frameAspect ? frameRect.width : frameRect.height * imageAspect;
  const renderedHeight = imageAspect > frameAspect ? frameRect.width / imageAspect : frameRect.height;
  const offsetX = (frameRect.width - renderedWidth) / 2;
  const offsetY = (frameRect.height - renderedHeight) / 2;
  const localX = event.clientX - frameRect.left;
  const localY = event.clientY - frameRect.top;
  const x = localX - offsetX;
  const y = localY - offsetY;

  if (x < 0 || y < 0 || x > renderedWidth || y > renderedHeight) return null;
  return { x: localX, y: localY };
};

const MeasureOverlay: React.FC<MeasureOverlayProps> = ({ isActive, imageUrl, onClose }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [referenceLengthInches, setReferenceLengthInches] = useState(18);
  const [referencePoints, setReferencePoints] = useState<Point[]>([]);
  const [measurePoints, setMeasurePoints] = useState<Point[]>([]);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);

  useEffect(() => {
    if (!isActive) {
      setReferencePoints([]);
      setMeasurePoints([]);
      setDraftPoints([]);
    }
  }, [isActive]);

  const pixelsPerInch = useMemo(() => {
    if (referencePoints.length !== 2 || referenceLengthInches <= 0) return null;
    return distance(referencePoints[0], referencePoints[1]) / referenceLengthInches;
  }, [referenceLengthInches, referencePoints]);

  const activePoints = pixelsPerInch ? measurePoints : draftPoints;
  const instruction = pixelsPerInch
    ? (measurePoints.length === 0 ? 'Click a start point to measure.' : 'Click an end point to calculate distance.')
    : (draftPoints.length === 0 ? 'Click the first point of a known reference.' : 'Click the second point of that reference.');

  const measuredInches = pixelsPerInch && measurePoints.length === 2
    ? distance(measurePoints[0], measurePoints[1]) / pixelsPerInch
    : null;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const point = getImagePoint(event, imageRef.current);
    if (!point) return;

    if (!pixelsPerInch) {
      setDraftPoints((previous) => {
        const next = previous.length >= 2 ? [point] : [...previous, point];
        if (next.length === 2) {
          setReferencePoints(next);
          setMeasurePoints([]);
          return [];
        }
        return next;
      });
      return;
    }

    setMeasurePoints((previous) => previous.length >= 2 ? [point] : [...previous, point]);
  };

  if (!isActive || !imageUrl) return null;

  return (
    <div className="ic-measure-backdrop" role="dialog" aria-modal="true" aria-label="Measure room scale">
      <div className="ic-measure-panel">
        <div className="ic-measure-header">
          <div>
            <p>Measure</p>
            <h2>Calibrate Room Scale</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close measure tool">Close</button>
        </div>

        <label className="ic-measure-reference">
          <span>Reference length</span>
          <input
            type="number"
            min="1"
            step="0.5"
            value={referenceLengthInches}
            onChange={(event) => setReferenceLengthInches(Number(event.target.value) || 1)}
          />
          <strong>in</strong>
        </label>

        <div className="ic-measure-frame" onClick={handleClick}>
          <img ref={imageRef} src={imageUrl} alt="Room scene for measurement" />
          <svg className="ic-measure-svg" aria-hidden="true">
            {referencePoints.length === 2 && (
              <line className="ic-measure-reference-line" x1={referencePoints[0].x} y1={referencePoints[0].y} x2={referencePoints[1].x} y2={referencePoints[1].y} />
            )}
            {activePoints.length === 2 && (
              <line x1={activePoints[0].x} y1={activePoints[0].y} x2={activePoints[1].x} y2={activePoints[1].y} />
            )}
          </svg>
          {[...referencePoints, ...activePoints].map((point, index) => (
            <span key={`${point.x}-${point.y}-${index}`} className="ic-measure-point" style={{ left: point.x, top: point.y }} />
          ))}
          <div className="ic-measure-instruction">{instruction}</div>
          {measuredInches !== null && (
            <div
              className="ic-measure-result"
              style={{
                left: (measurePoints[0].x + measurePoints[1].x) / 2,
                top: (measurePoints[0].y + measurePoints[1].y) / 2,
              }}
            >
              {(measuredInches / 12).toFixed(2)} ft / {measuredInches.toFixed(1)} in
            </div>
          )}
        </div>

        <div className="ic-measure-actions">
          <button type="button" onClick={() => { setReferencePoints([]); setMeasurePoints([]); setDraftPoints([]); }}>Reset Scale</button>
          <button type="button" onClick={() => setMeasurePoints([])} disabled={!pixelsPerInch}>New Measurement</button>
        </div>
      </div>
    </div>
  );
};

export default MeasureOverlay;
