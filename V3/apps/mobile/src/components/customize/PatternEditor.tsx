import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, spacing, radius } from '../../theme';
import type { DesignData, DesignElement } from '../../services/customize.service';

const SCREEN_WIDTH = Dimensions.get('window').width;

type EditorAction =
  | { type: 'ADD_IMAGE'; payload: { imageUrl: string; width: number; height: number } }
  | { type: 'ADD_TEXT'; payload: { text: string; fontFamily: string; fontSize: number; fontColor: string } }
  | { type: 'UPDATE_ELEMENT'; payload: { index: number; changes: Partial<DesignElement> } }
  | { type: 'REMOVE_ELEMENT'; payload: { index: number } }
  | { type: 'SET_ELEMENTS'; payload: { elements: DesignElement[] } };

interface PatternEditorProps {
  designData: DesignData;
  productTemplate?: {
    uvMapUrl: string;
    printArea: { x: number; y: number; width: number; height: number };
  };
  onDesignChange: (data: DesignData) => void;
}

interface HistoryEntry {
  elements: DesignElement[];
  timestamp: number;
}

function generateCanvasHtml(
  designData: DesignData,
  productTemplate: PatternEditorProps['productTemplate'],
  canvasWidth: number,
  canvasHeight: number,
): string {
  const printArea = productTemplate?.printArea ?? {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
  };

  const elementsJson = JSON.stringify(designData.elements);
  const printAreaJson = JSON.stringify(printArea);
  const bgImage = productTemplate?.uvMapUrl ?? '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #F5F5F5; overflow: hidden; touch-action: none; }
  #canvas-container { position: relative; width: ${canvasWidth}px; height: ${canvasHeight}px; margin: 0 auto; background: #FFFFFF; }
  #bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.3; pointer-events: none; }
  #print-area { position: absolute; border: 1px dashed #E94560; pointer-events: none; z-index: 1; }
  .element { position: absolute; cursor: move; touch-action: none; user-select: none; }
  .element.selected { outline: 2px solid #E94560; outline-offset: 2px; }
  .element img { width: 100%; height: 100%; pointer-events: none; }
  .element .text-content { pointer-events: none; white-space: nowrap; }
  .resize-handle { position: absolute; width: 20px; height: 20px; background: #E94560; border-radius: 50%; z-index: 10; }
  .resize-handle.br { bottom: -10px; right: -10px; cursor: nwse-resize; }
  .rotate-handle { position: absolute; width: 20px; height: 20px; background: #1A1A2E; border-radius: 50%; top: -30px; left: 50%; margin-left: -10px; cursor: grab; z-index: 10; }
  .rotate-line { position: absolute; width: 1px; height: 10px; background: #1A1A2E; top: -20px; left: 50%; z-index: 10; }
</style>
</head>
<body>
<div id="canvas-container">
  ${bgImage ? `<img id="bg-image" src="${bgImage}" />` : ''}
  <div id="print-area"></div>
  <div id="elements-layer"></div>
</div>
<script>
(function() {
  var elements = ${elementsJson};
  var printArea = ${printAreaJson};
  var selectedIndex = -1;
  var dragState = null;
  var container = document.getElementById('canvas-container');
  var elementsLayer = document.getElementById('elements-layer');
  var printAreaEl = document.getElementById('print-area');

  printAreaEl.style.left = printArea.x + 'px';
  printAreaEl.style.top = printArea.y + 'px';
  printAreaEl.style.width = printArea.width + 'px';
  printAreaEl.style.height = printArea.height + 'px';

  function render() {
    elementsLayer.innerHTML = '';
    elements.forEach(function(el, i) {
      var div = document.createElement('div');
      div.className = 'element' + (i === selectedIndex ? ' selected' : '');
      div.style.left = el.x + 'px';
      div.style.top = el.y + 'px';
      div.style.width = el.width + 'px';
      div.style.height = el.height + 'px';
      div.style.transform = 'rotate(' + el.rotation + 'deg) scale(' + el.scaleX + ',' + el.scaleY + ')';
      div.style.opacity = el.opacity !== undefined ? el.opacity : 1;
      div.setAttribute('data-index', i);

      if (el.type === 'image' && el.imageUrl) {
        var img = document.createElement('img');
        img.src = el.imageUrl;
        img.draggable = false;
        div.appendChild(img);
      } else if (el.type === 'text' && el.text) {
        var span = document.createElement('span');
        span.className = 'text-content';
        span.textContent = el.text;
        span.style.fontFamily = el.fontFamily || 'sans-serif';
        span.style.fontSize = (el.fontSize || 16) + 'px';
        span.style.color = el.fontColor || '#1A1A1A';
        div.appendChild(span);
      }

      if (i === selectedIndex) {
        var rotateLine = document.createElement('div');
        rotateLine.className = 'rotate-line';
        div.appendChild(rotateLine);

        var rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.setAttribute('data-action', 'rotate');
        div.appendChild(rotateHandle);

        var resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle br';
        resizeHandle.setAttribute('data-action', 'resize');
        div.appendChild(resizeHandle);
      }

      elementsLayer.appendChild(div);
    });
  }

  function getPos(touch) {
    var rect = container.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function getElementCenter(el) {
    return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  }

  container.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var pos = getPos(touch);
    var target = e.target;

    if (target.getAttribute('data-action') === 'rotate' && selectedIndex >= 0) {
      var center = getElementCenter(elements[selectedIndex]);
      dragState = { type: 'rotate', center: center, startAngle: Math.atan2(pos.y - center.y, pos.x - center.x) * 180 / Math.PI, originalRotation: elements[selectedIndex].rotation };
      return;
    }

    if (target.getAttribute('data-action') === 'resize' && selectedIndex >= 0) {
      var center2 = getElementCenter(elements[selectedIndex]);
      var dist = Math.sqrt(Math.pow(pos.x - center2.x, 2) + Math.pow(pos.y - center2.y, 2));
      dragState = { type: 'resize', center: center2, startDist: dist, originalScaleX: elements[selectedIndex].scaleX, originalScaleY: elements[selectedIndex].scaleY, originalWidth: elements[selectedIndex].width, originalHeight: elements[selectedIndex].height };
      return;
    }

    var elDiv = target.closest('.element');
    if (elDiv) {
      var idx = parseInt(elDiv.getAttribute('data-index'));
      selectedIndex = idx;
      var el = elements[idx];
      dragState = { type: 'move', startX: pos.x, startY: pos.y, origX: el.x, origY: el.y };
      render();
    } else if (!target.closest('.resize-handle') && !target.closest('.rotate-handle')) {
      selectedIndex = -1;
      render();
    }
  }, { passive: false });

  container.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!dragState || selectedIndex < 0) return;
    var touch = e.touches[0];
    var pos = getPos(touch);
    var el = elements[selectedIndex];

    if (dragState.type === 'move') {
      el.x = dragState.origX + (pos.x - dragState.startX);
      el.y = dragState.origY + (pos.y - dragState.startY);
      render();
      notifyChange();
    } else if (dragState.type === 'rotate') {
      var angle = Math.atan2(pos.y - dragState.center.y, pos.x - dragState.center.x) * 180 / Math.PI;
      el.rotation = dragState.originalRotation + (angle - dragState.startAngle);
      render();
      notifyChange();
    } else if (dragState.type === 'resize') {
      var dist = Math.sqrt(Math.pow(pos.x - dragState.center.x, 2) + Math.pow(pos.y - dragState.center.y, 2));
      var scale = dist / dragState.startDist;
      el.scaleX = Math.max(0.1, dragState.originalScaleX * scale);
      el.scaleY = Math.max(0.1, dragState.originalScaleY * scale);
      el.width = Math.max(20, dragState.originalWidth * scale);
      el.height = Math.max(20, dragState.originalHeight * scale);
      render();
      notifyChange();
    }
  }, { passive: false });

  container.addEventListener('touchend', function(e) {
    if (dragState) {
      dragState = null;
      notifyChange();
    }
  });

  function notifyChange() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DESIGN_CHANGE', elements: JSON.parse(JSON.stringify(elements)) }));
  }

  window.addEventListener('message', function(e) {
    var msg = JSON.parse(e.data);
    if (msg.type === 'ADD_IMAGE') {
      var img = new Image();
      img.onload = function() {
        var ratio = img.width / img.height;
        var w = Math.min(200, printArea.width * 0.6);
        var h = w / ratio;
        elements.push({ type: 'image', x: printArea.x + (printArea.width - w) / 2, y: printArea.y + (printArea.height - h) / 2, scaleX: 1, scaleY: 1, rotation: 0, width: w, height: h, imageUrl: msg.payload.imageUrl, opacity: 1 });
        selectedIndex = elements.length - 1;
        render();
        notifyChange();
      };
      img.src = msg.payload.imageUrl;
    } else if (msg.type === 'ADD_TEXT') {
      var fontSize = msg.payload.fontSize || 24;
      var textW = msg.payload.text.length * fontSize * 0.7;
      var textH = fontSize * 1.5;
      elements.push({ type: 'text', x: printArea.x + (printArea.width - textW) / 2, y: printArea.y + (printArea.height - textH) / 2, scaleX: 1, scaleY: 1, rotation: 0, width: textW, height: textH, text: msg.payload.text, fontFamily: msg.payload.fontFamily || 'sans-serif', fontSize: fontSize, fontColor: msg.payload.fontColor || '#1A1A1A', opacity: 1 });
      selectedIndex = elements.length - 1;
      render();
      notifyChange();
    } else if (msg.type === 'REMOVE_SELECTED') {
      if (selectedIndex >= 0) {
        elements.splice(selectedIndex, 1);
        selectedIndex = -1;
        render();
        notifyChange();
      }
    } else if (msg.type === 'SET_ELEMENTS') {
      elements = msg.payload.elements;
      selectedIndex = -1;
      render();
    } else if (msg.type === 'SELECT_ELEMENT') {
      selectedIndex = msg.payload.index;
      render();
    } else if (msg.type === 'UPDATE_ELEMENT') {
      if (msg.payload.index >= 0 && msg.payload.index < elements.length) {
        Object.assign(elements[msg.payload.index], msg.payload.changes);
        render();
        notifyChange();
      }
    }
  });

  render();
})();
</script>
</body>
</html>`;
}

export const PatternEditor = forwardRef<PatternEditorHandle, PatternEditorProps>(({
  designData,
  productTemplate,
  onDesignChange,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [canvasSize, setCanvasSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 });
  const [history, setHistory] = useState<HistoryEntry[]>([
    { elements: designData.elements, timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentElements = useRef<DesignElement[]>(designData.elements);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setCanvasSize({ width, height: width * 1.2 });
  }, []);

  const pushHistory = useCallback((elements: DesignElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ elements: JSON.parse(JSON.stringify(elements)), timestamp: Date.now() });
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'DESIGN_CHANGE' && msg.elements) {
          currentElements.current = msg.elements;
          onDesignChange({
            ...designData,
            elements: msg.elements,
          });
          pushHistory(msg.elements);
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [designData, onDesignChange, pushHistory],
  );

  const addImage = useCallback((imageUrl: string, width: number, height: number) => {
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({ type: 'ADD_IMAGE', payload: { imageUrl: '${imageUrl.replace(/'/g, "\\'")}', width: ${width}, height: ${height} } })); true;`,
    );
  }, []);

  const addText = useCallback(
    (text: string, fontFamily: string, fontSize: number, fontColor: string) => {
      webViewRef.current?.injectJavaScript(
        `window.postMessage(JSON.stringify({ type: 'ADD_TEXT', payload: { text: '${text.replace(/'/g, "\\'")}', fontFamily: '${fontFamily}', fontSize: ${fontSize}, fontColor: '${fontColor}' } })); true;`,
      );
    },
    [],
  );

  const removeSelected = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({ type: 'REMOVE_SELECTED' })); true;`,
    );
  }, []);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const entry = history[newIndex];
    currentElements.current = entry.elements;
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({ type: 'SET_ELEMENTS', payload: { elements: ${JSON.stringify(entry.elements)} } })); true;`,
    );
    onDesignChange({ ...designData, elements: entry.elements });
  }, [history, historyIndex, designData, onDesignChange]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const entry = history[newIndex];
    currentElements.current = entry.elements;
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({ type: 'SET_ELEMENTS', payload: { elements: ${JSON.stringify(entry.elements)} } })); true;`,
    );
    onDesignChange({ ...designData, elements: entry.elements });
  }, [history, historyIndex, designData, onDesignChange]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useImperativeHandle(ref, () => ({
    addImage,
    addText,
    removeSelected,
    undo,
    redo,
    canUndo,
    canRedo,
  }), [addImage, addText, removeSelected, undo, redo, canUndo, canRedo]);

  const html = useMemo(
    () => generateCanvasHtml(designData, productTemplate, canvasSize.width, canvasSize.height),
    [designData, productTemplate, canvasSize.width, canvasSize.height],
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
});

PatternEditor.displayName = 'PatternEditor';

export interface PatternEditorHandle {
  addImage: (imageUrl: string, width: number, height: number) => void;
  addText: (text: string, fontFamily: string, fontSize: number, fontColor: string) => void;
  removeSelected: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function usePatternEditor(): PatternEditorHandle {
  const editorRef = useRef<PatternEditorHandle>({
    addImage: () => {},
    addText: () => {},
    removeSelected: () => {},
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
  });

  return editorRef.current;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
