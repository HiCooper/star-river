export default {
  mounted() {
    // Wait for mermaid to be rendered
    setTimeout(() => {
      initMermaidZoom()
    }, 1000)
  }
}

function initMermaidZoom() {
  // Find all mermaid diagrams
  const mermaidDivs = document.querySelectorAll('.mermaid')
  
  mermaidDivs.forEach((div, index) => {
    // Create zoom button
    const btn = document.createElement('button')
    btn.className = 'mermaid-zoom-btn'
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 3 21 3 21 9"></polyline>
      <polyline points="9 21 3 21 3 15"></polyline>
      <line x1="21" y1="3" x2="14" y2="10"></line>
      <line x1="3" y1="21" x2="10" y2="14"></line>
    </svg>`
    btn.title = '放大查看'
    
    btn.addEventListener('click', () => openFullscreen(div))
    
    // Style the button
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
    `
    
    // Show button on hover
    div.style.position = 'relative'
    div.addEventListener('mouseenter', () => btn.style.opacity = '1')
    div.addEventListener('mouseleave', () => btn.style.opacity = '0')
    
    div.appendChild(btn)
  })
}

function openFullscreen(div) {
  // Create overlay
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `
  
  // Clone the mermaid content
  const clone = div.cloneNode(true)
  clone.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    background: white;
    border-radius: 8px;
    padding: 20px;
    overflow: auto;
  `
  clone.querySelector('.mermaid-zoom-btn')?.remove()
  
  // Create close button
  const closeBtn = document.createElement('button')
  closeBtn.innerHTML = '&times;'
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 24px;
    line-height: 40px;
    text-align: center;
  `
  
  overlay.appendChild(clone)
  overlay.appendChild(closeBtn)
  
  // Close on click overlay or close button
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === closeBtn) {
      document.body.removeChild(overlay)
    }
  })
  
  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay)
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)
  
  document.body.appendChild(overlay)
}
