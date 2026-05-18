// Mermaid zoom functionality
document.addEventListener('DOMContentLoaded', function() {
  // Wait for mermaid to render
  setTimeout(initMermaidZoom, 1500);
});

function initMermaidZoom() {
  const mermaidDivs = document.querySelectorAll('.mermaid:not(.zoom-initialized)');
  
  mermaidDivs.forEach((div) => {
    div.classList.add('zoom-initialized');
    
    // Create zoom button
    const btn = document.createElement('button');
    btn.className = 'mermaid-zoom-btn';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    btn.title = '放大查看';
    
    btn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    div.style.position = 'relative';
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMermaidFullscreen(div);
    });
    
    div.appendChild(btn);
    
    div.addEventListener('mouseenter', () => btn.style.opacity = '1');
    div.addEventListener('mouseleave', () => btn.style.opacity = '0');
  });
  
  // Re-check after more time for dynamically loaded content
  setTimeout(initMermaidZoom, 3000);
}

function openMermaidFullscreen(div) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    background: white;
    border-radius: 8px;
    padding: 24px;
    overflow: auto;
    position: relative;
  `;
  
  // Clone mermaid SVG
  const svg = div.querySelector('svg');
  if (svg) {
    const clone = svg.cloneNode(true);
    clone.style.cssText = 'max-width: 100%; height: auto;';
    content.appendChild(clone);
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    background: #333;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    line-height: 36px;
    text-align: center;
  `;
  content.appendChild(closeBtn);
  
  overlay.appendChild(content);
  
  const closeHandler = (e) => {
    if (e.target === overlay || e.target === closeBtn) {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  
  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  
  overlay.addEventListener('click', closeHandler);
  document.addEventListener('keydown', keyHandler);
  
  document.body.appendChild(overlay);
}
