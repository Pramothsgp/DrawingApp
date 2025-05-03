"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Tool = "pencil" | "rectangle" | "circle" | "eraser";
type Color = string;
type BrushSize = number;

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  dataURL: string;
}

interface CanvasHistory {
  past: string[];
  future: string[];
  current: string | null;
}

export default function DrawingApp() {
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<Color>("#000000");
  const [brushSize, setBrushSize] = useState<BrushSize>(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([
    { id: "layer-1", name: "Layer 1", visible: true, dataURL: "" },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
  const [history, setHistory] = useState<CanvasHistory>({
    past: [],
    future: [],
    current: null,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSizeSlider, setShowBrushSizeSlider] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startDrawPos = useRef<{ x: number; y: number } | null>(null);

  const colorOptions = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", 
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"
  ];
  
  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return ctx;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (history.current) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = history.current;
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    saveToHistory();
    
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL();
    
    setHistory(prev => ({
      past: [...prev.past, dataURL],
      future: [],
      current: dataURL,
    }));
    
    // Update active layer with current canvas state
    updateLayerDataURL(activeLayerId, dataURL);
  };

  // Update layer's dataURL
  const updateLayerDataURL = (layerId: string, dataURL: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId ? { ...layer, dataURL } : layer
      )
    );
  };

  // Undo action
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.past.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const newPast = [...history.past];
    const lastState = newPast.pop();
    
    if (!lastState) return;
    
    setHistory(prev => ({
      past: newPast,
      future: [prev.current!, ...prev.future],
      current: lastState,
    }));
    
    // Restore canvas to last state
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Update active layer
      updateLayerDataURL(activeLayerId, lastState);
    };
    img.src = lastState;
  };

  // Redo action
  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.future.length === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const newFuture = [...history.future];
    const nextState = newFuture.shift();
    
    if (!nextState) return;
    
    setHistory(prev => ({
      past: [...prev.past, prev.current!],
      future: newFuture,
      current: nextState,
    }));
    
    // Restore canvas to next state
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Update active layer
      updateLayerDataURL(activeLayerId, nextState);
    };
    img.src = nextState;
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Save current state before clearing
    const currentState = canvas.toDataURL();
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHistory(prev => ({
      past: [...prev.past, currentState],
      future: [],
      current: canvas.toDataURL(),
    }));
    
    // Update active layer
    updateLayerDataURL(activeLayerId, canvas.toDataURL());
  };

  // Save drawing as image
  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary link element
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add new layer
  const addLayer = () => {
    const newId = `layer-${layers.length + 1}`;
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      dataURL: "",
    };
    
    setLayers([...layers, newLayer]);
    setActiveLayerId(newId);
    
    // Clear canvas for new layer
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state for new layer
    saveToHistory();
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
    
    // If toggling active layer, update canvas display
    if (layerId === activeLayerId) {
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        if (!layer.visible) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (layer.dataURL) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = layer.dataURL;
        }
      }
    }
  };

  // Switch to a different layer
  const switchLayer = (layerId: string) => {
    // Save current layer state
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const currentDataURL = canvas.toDataURL();
    updateLayerDataURL(activeLayerId, currentDataURL);
    
    // Switch to selected layer
    setActiveLayerId(layerId);
    
    // Load selected layer content
    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.dataURL && layer.visible) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = layer.dataURL;
    } else {
      // If layer has no content or is not visible, clear canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Reset history for the new active layer
    setHistory({
      past: [],
      future: [],
      current: layer?.dataURL || null,
    });
  };

  // Reorder layers
  const moveLayer = (layerId: string, direction: "up" | "down") => {
    const layerIndex = layers.findIndex(layer => layer.id === layerId);
    if (layerIndex === -1) return;
    
    const newLayers = [...layers];
    
    if (direction === "up" && layerIndex > 0) {
      // Move layer up (swap with layer above)
      [newLayers[layerIndex], newLayers[layerIndex - 1]] = [newLayers[layerIndex - 1], newLayers[layerIndex]];
    } else if (direction === "down" && layerIndex < layers.length - 1) {
      // Move layer down (swap with layer below)
      [newLayers[layerIndex], newLayers[layerIndex + 1]] = [newLayers[layerIndex + 1], newLayers[layerIndex]];
    }
    
    setLayers(newLayers);
  };

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    
    // Configure context based on selected tool
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = brushSize;
    
    if (tool === "pencil") {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === "rectangle" || tool === "circle") {
      startDrawPos.current = { x, y };
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    if (tool === "pencil" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if ((tool === "rectangle" || tool === "circle") && startDrawPos.current) {
      // For shapes, continuously redraw by restoring the canvas state
      if (history.current) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Draw preview of shape
          ctx.strokeStyle = color;
          ctx.lineWidth = brushSize;
          
          const startX = startDrawPos.current!.x;
          const startY = startDrawPos.current!.y;
          
          if (tool === "rectangle") {
            ctx.strokeRect(startX, startY, x - startX, y - startY);
          } else if (tool === "circle") {
            const radiusX = Math.abs(x - startX) / 2;
            const radiusY = Math.abs(y - startY) / 2;
            const centerX = Math.min(startX, x) + radiusX;
            const centerY = Math.min(startY, y) + radiusY;
            
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
        };
        img.src = history.current;
      }
    }
  };

  const endDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    if (tool === "pencil" || tool === "eraser") {
      ctx.closePath();
    } else if ((tool === "rectangle" || tool === "circle") && startDrawPos.current) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const startX = startDrawPos.current.x;
      const startY = startDrawPos.current.y;
      
      // Draw final shape
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      
      if (tool === "rectangle") {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (tool === "circle") {
        const radiusX = Math.abs(x - startX) / 2;
        const radiusY = Math.abs(y - startY) / 2;
        const centerX = Math.min(startX, x) + radiusX;
        const centerY = Math.min(startY, y) + radiusY;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      startDrawPos.current = null;
    }
    
    setIsDrawing(false);
    saveToHistory();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <svg
              className="h-8 w-8 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            <span className="ml-2 text-xl font-semibold text-gray-800">CanvasHub</span>
          </motion.div>
          
          <div className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Features</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Gallery</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Pricing</a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Support</a>
          </div>
          
          <div className="flex items-center">
            <button className="hidden md:block bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 font-medium transition-colors duration-200">
              Sign In
            </button>
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-600 hover:text-blue-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white shadow-inner"
            >
              <div className="container mx-auto px-4 py-3 flex flex-col space-y-3">
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Features</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Gallery</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Pricing</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Support</a>
                <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 font-medium transition-colors duration-200 w-full">
                  Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      
      {/* Hero/Landing Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24"
      >
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight"
            >
              Unleash Your Creativity with <span className="text-blue-600">Canvas</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg text-gray-600 mt-4 mb-6"
            >
              A powerful digital drawing platform for artists, designers, and creative minds. Create stunning illustrations with our intuitive tools.
            </motion.p>
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md shadow-md hover:shadow-lg transition-all duration-200"
            >
              Start Drawing Now
            </motion.button>
          </div>
          <div className="md:w-1/2">
            <motion.img 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              src="/api/placeholder/600/400" 
              alt="Drawing application preview" 
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>
      </motion.section>
      
      {/* Main Drawing Interface */}
      <section className="flex-grow py-8 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Drawing Canvas</h2>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar - Tools */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full lg:w-64 bg-white p-4 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-medium text-gray-700 mb-4">Tools</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool("pencil")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center transition-colors duration-200 ${
                    tool === "pencil" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Pencil Tool"
                >
                  <svg className="h-6 w-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                  </svg>
                  <span className="text-xs">Pencil</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool("eraser")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center transition-colors duration-200 ${
                    tool === "eraser" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Eraser Tool"
                >
                  <svg className="h-6 w-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 10L4 2m0 0l8 8m-8-8v16h16" />
                  </svg>
                  <span className="text-xs">Eraser</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool("rectangle")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center transition-colors duration-200 ${
                    tool === "rectangle" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Rectangle Tool"
                >
                  <svg className="h-6 w-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  <span className="text-xs">Rectangle</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTool("circle")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center transition-colors duration-200 ${
                    tool === "circle" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Circle Tool"
                >
                  <svg className="h-6 w-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="text-xs">Circle</span>
                </motion.button>
              </div>
              
              {/* Color Selection */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Color</h4>
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer"
                    style={{ backgroundColor: color }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                </div>
                
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {colorOptions.map((colorOption) => (
                          <div
                            key={colorOption}
                            className={`w-6 h-6 rounded-full cursor-pointer border hover:scale-110 transition-transform duration-200 ${
                              color === colorOption ? "ring-2 ring-blue-500" : "border-gray-300"
                            }`}
                            style={{ backgroundColor: colorOption }}
                            onClick={() => {
                              setColor(colorOption);
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full h-10 mt-2"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Brush Size */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Brush Size</h4>
                  <button
                    onClick={() => setShowBrushSizeSlider(!showBrushSizeSlider)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {brushSize}px
                  </button>
                </div>
                
                <AnimatePresence>
                  {showBrushSizeSlider && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2"
                    >
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1px</span>
                        <span>15px</span>
                        <span>30px</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUndo}
                  disabled={history.past.length === 0}
                  className={`w-full py-2 px-4 rounded-md flex items-center justify-center space-x-2 ${
                    history.past.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title="Undo"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h10a8 8 0 0 1 8 8v0a8 8 0 0 1-8 8h-4" />
                    <path d="M3 10l5-5" />
                    <path d="M3 10l5 5" />
                  </svg>
                  <span>Undo</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRedo}
                  disabled={history.future.length === 0}
                  className={`w-full py-2 px-4 rounded-md flex items-center justify-center space-x-2 ${
                    history.future.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title="Redo"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10H11a8 8 0 0 0-8 8v0a8 8 0 0 0 8 8h4" />
                    <path d="M21 10l-5-5" />
                    <path d="M21 10l-5 5" />
                  </svg>
                  <span>Redo</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClear}
                  className="w-full py-2 px-4 rounded-md bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center space-x-2"
                  title="Clear Canvas"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Clear</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveImage}
                  className="w-full py-2 px-4 rounded-md bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center space-x-2"
                  title="Save as Image"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Save Image</span>
                </motion.button>
              </div>
            </motion.div>
            
            {/* Center - Canvas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-grow bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="w-full h-[500px] relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
            </motion.div>
            
            {/* Right Sidebar - Layers */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-full lg:w-64 bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-700">Layers</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={addLayer}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1"
                  title="Add Layer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </motion.button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {layers.map((layer, index) => (
                  <div 
                    key={layer.id}
                    className={`p-3 rounded-md border transition-colors duration-200 ${
                      activeLayerId === layer.id 
                        ? "border-blue-400 bg-blue-50" 
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className="text-gray-500 hover:text-gray-700"
                          title={layer.visible ? "Hide Layer" : "Show Layer"}
                        >
                          <svg 
                            className="h-5 w-5" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            {layer.visible ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                                <path d="M1 1l22 22" />
                              </>
                            )}
                          </svg>
                        </button>
                        
                        <span 
                          className="font-medium text-gray-700 cursor-pointer"
                          onClick={() => switchLayer(layer.id)}
                        >
                          {layer.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {index > 0 && (
                          <button
                            onClick={() => moveLayer(layer.id, "up")}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Move Up"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                        )}
                        
                        {index < layers.length - 1 && (
                          <button
                            onClick={() => moveLayer(layer.id, "down")}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Move Down"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* User Account Preview */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <img 
                    src="https://randomuser.me/api/portraits/men/44.jpg" 
                    alt="User avatar" 
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Pramoth Natarajan</h4>
                    <p className="text-xs text-gray-500">Pro Member</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <svg
                  className="h-8 w-8 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
                <span className="ml-2 text-xl font-semibold">CanvasHub</span>
              </div>
              <p className="text-gray-400 mt-2 text-sm">
                A powerful digital drawing platform for artists, designers, and creative minds.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h5 className="text-lg font-medium mb-3">Product</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Templates</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Gallery</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Pricing</a></li>
                </ul>
              </div>
              
              <div>
                <h5 className="text-lg font-medium mb-3">Company</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors duration-200">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors duration-200">Contact</a></li>
                </ul>
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <h5 className="text-lg font-medium mb-3">Connect</h5>
                <div className="flex space-x-4 mt-3">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/pramoth_sgp/" className="text-gray-400 hover:text-white transition-colors duration-200">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/in/pramoth-sgp-8263372a0/" className="text-gray-400 hover:text-white transition-colors duration-200">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} CanvasHub. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-4 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors duration-200">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}