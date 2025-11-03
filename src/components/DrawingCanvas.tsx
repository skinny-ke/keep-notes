import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Download, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface DrawingCanvasProps {
  onSave: (dataUrl: string) => void;
}

const DrawingCanvas = ({ onSave }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Initialize the freeDrawingBrush right after canvas creation
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

    fabricCanvas.freeDrawingBrush.color = isEraser ? "#ffffff" : color;
    fabricCanvas.freeDrawingBrush.width = isEraser ? 20 : brushSize;
  }, [color, brushSize, isEraser, fabricCanvas]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ 
      format: 'png',
      multiplier: 1
    });
    onSave(dataUrl);
  };

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", 
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500"
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          size="sm"
          variant={!isEraser ? "secondary" : "ghost"}
          onClick={() => setIsEraser(false)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Draw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isEraser ? "secondary" : "ghost"}
          onClick={() => setIsEraser(true)}
        >
          <Eraser className="h-4 w-4 mr-2" />
          Erase
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <div className="flex gap-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              className="w-6 h-6 rounded-full border-2 border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
            />
          ))}
        </div>
        <div className="w-px h-8 bg-border mx-1" />
        <div className="flex items-center gap-2">
          <Label className="text-xs">Size:</Label>
          <input
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <div className="w-px h-8 bg-border mx-1" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClear}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
        >
          <Download className="h-4 w-4 mr-2" />
          Save Drawing
        </Button>
      </div>
      <div className="border border-border rounded-lg overflow-hidden shadow-lg">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default DrawingCanvas;
