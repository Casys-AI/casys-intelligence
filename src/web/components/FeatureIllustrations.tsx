// @ts-nocheck
export function GraphRAGIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="node-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 150) rotate(90) scale(120)">
          <stop stop-color="#FFB86F" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#FFB86F" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
        </filter>
      </defs>

      {/* Background Glow */}
      <circle cx="200" cy="150" r="100" fill="url(#node-glow)" />

      {/* Network Connections */}
      <g stroke="#FFB86F" stroke-width="1" stroke-opacity="0.3">
        {/* Central Hub Connections */}
        <line x1="200" y1="150" x2="100" y2="80" />
        <line x1="200" y1="150" x2="300" y2="80" />
        <line x1="200" y1="150" x2="100" y2="220" />
        <line x1="200" y1="150" x2="300" y2="220" />
        <line x1="200" y1="150" x2="50" y2="150" />
        <line x1="200" y1="150" x2="350" y2="150" />
        
        {/* Secondary Connections */}
        <line x1="100" y1="80" x2="150" y2="40" />
        <line x1="300" y1="80" x2="250" y2="40" />
        <line x1="100" y1="220" x2="150" y2="260" />
        <line x1="300" y1="220" x2="250" y2="260" />
        <line x1="100" y1="80" x2="50" y2="150" />
        <line x1="300" y1="80" x2="350" y2="150" />
      </g>

      {/* Active Data Packets */}
      <circle cx="150" cy="115" r="3" fill="#FFB86F">
        <animate attributeName="cx" values="200;100" dur="2s" repeatCount="indefinite" />
        <animate attributeName="cy" values="150;80" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="250" cy="185" r="3" fill="#FFB86F">
        <animate attributeName="cx" values="200;300" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values="150;220" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Nodes */}
      <g fill="#0a0908" stroke="#FFB86F" stroke-width="2">
        {/* Center Node */}
        <circle cx="200" cy="150" r="20" stroke-width="4" />
        
        {/* Surrounding Nodes */}
        <circle cx="100" cy="80" r="10" />
        <circle cx="300" cy="80" r="10" />
        <circle cx="100" cy="220" r="10" />
        <circle cx="300" cy="220" r="10" />
        <circle cx="50" cy="150" r="8" />
        <circle cx="350" cy="150" r="8" />
        <circle cx="150" cy="40" r="6" />
        <circle cx="250" cy="40" r="6" />
        <circle cx="150" cy="260" r="6" />
        <circle cx="250" cy="260" r="6" />
      </g>

      {/* Node Centers */}
      <circle cx="200" cy="150" r="8" fill="#FFB86F" />
      <circle cx="100" cy="80" r="4" fill="#FFB86F" fill-opacity="0.6" />
      <circle cx="300" cy="80" r="4" fill="#FFB86F" fill-opacity="0.6" />
      <circle cx="100" cy="220" r="4" fill="#FFB86F" fill-opacity="0.6" />
      <circle cx="300" cy="220" r="4" fill="#FFB86F" fill-opacity="0.6" />
    </svg>
  );
}

export function DAGIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dag-flow" x1="0" y1="150" x2="400" y2="150" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFB86F" stop-opacity="0.1"/>
          <stop offset="0.5" stop-color="#FFB86F" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#FFB86F" stop-opacity="0.1"/>
        </linearGradient>
      </defs>

      {/* Pipelines */}
      <path d="M50 150 C 100 150, 100 80, 150 80 L 250 80 C 300 80, 300 150, 350 150" 
            stroke="url(#dag-flow)" stroke-width="4" fill="none" />
      <path d="M50 150 C 100 150, 100 220, 150 220 L 250 220 C 300 220, 300 150, 350 150" 
            stroke="url(#dag-flow)" stroke-width="4" fill="none" />
      <path d="M50 150 L 350 150" 
            stroke="url(#dag-flow)" stroke-width="2" stroke-dasharray="8 8" fill="none" opacity="0.3" />

      {/* Processing Blocks */}
      <g fill="#0a0908" stroke="#FFB86F" stroke-width="2">
        <rect x="130" y="60" width="40" height="40" rx="8" />
        <rect x="230" y="60" width="40" height="40" rx="8" />
        
        <rect x="130" y="200" width="40" height="40" rx="8" />
        <rect x="230" y="200" width="40" height="40" rx="8" />
        
        <rect x="30" y="130" width="40" height="40" rx="8" />
        <rect x="330" y="130" width="40" height="40" rx="8" />
      </g>

      {/* Status Indicators */}
      <circle cx="150" cy="80" r="6" fill="#FFB86F" />
      <circle cx="250" cy="80" r="6" fill="#FFB86F" />
      <circle cx="150" cy="220" r="6" fill="#FFB86F" />
      <circle cx="250" cy="220" r="6" fill="#FFB86F" />
      
      {/* Moving Data Particles */}
      <circle r="4" fill="#FFB86F">
        {/* @ts-ignore - path is valid SVG attribute */}
        <animateMotion dur="3s" repeatCount="indefinite"
          path="M50 150 C 100 150, 100 80, 150 80 L 250 80 C 300 80, 300 150, 350 150" />
      </circle>
      <circle r="4" fill="#FFB86F">
        {/* @ts-ignore - path is valid SVG attribute */}
        <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite"
          path="M50 150 C 100 150, 100 220, 150 220 L 250 220 C 300 220, 300 150, 350 150" />
      </circle>
    </svg>
  );
}

export function SandboxIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Isometric Cube/Container */}
      <g transform="translate(200 150)">
        {/* Back Faces */}
        <path d="M-80 -40 L 0 -80 L 80 -40 L 80 60 L 0 100 L -80 60 Z" 
              fill="#FFB86F" fill-opacity="0.03" stroke="#FFB86F" stroke-width="1" stroke-dasharray="4 4"/>
        
        {/* Inner Shield */}
        <path d="M0 -30 L 40 -10 V 30 L 0 50 L -40 30 V -10 Z" 
              fill="#0a0908" stroke="#FFB86F" stroke-width="3" />
        
        {/* Code Symbol inside Shield */}
        <path d="M-15 10 L -25 20 L -15 30 M 15 10 L 25 20 L 15 30 M -5 35 L 5 5"
              stroke="#FFB86F" stroke-width="2" stroke-linecap="round" />

        {/* Outer Frame (Front) */}
        <path d="M-90 -45 L 0 -90 L 90 -45 L 90 65 L 0 110 L -90 65 Z" 
              stroke="#FFB86F" stroke-width="2" fill="none" />
              
        {/* Scanning Effect */}
        <path d="M-90 0 L 0 -45 L 90 0 L 0 45 Z" fill="#FFB86F" fill-opacity="0.1">
          {/* @ts-ignore - valid SVG animation */}
          <animateTransform attributeName="transform" type="translate"
            values="0 -40; 0 60; 0 -40" dur="4s" repeatCount="indefinite" />
           {/* @ts-ignore - valid SVG animation */}
          <animate attributeName="opacity" values="0;0.5;0" dur="4s" repeatCount="indefinite" />
        </path>

        {/* Corner Accents */}
        <circle cx="-90" cy="-45" r="3" fill="#FFB86F" />
        <circle cx="0" cy="-90" r="3" fill="#FFB86F" />
        <circle cx="90" cy="-45" r="3" fill="#FFB86F" />
        <circle cx="90" cy="65" r="3" fill="#FFB86F" />
        <circle cx="0" cy="110" r="3" fill="#FFB86F" />
        <circle cx="-90" cy="65" r="3" fill="#FFB86F" />
      </g>
    </svg>
  );
}

export function SearchIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="search-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#FFB86F" stop-opacity="0.2"/>
          <stop offset="1" stop-color="#FFB86F" stop-opacity="0"/>
        </linearGradient>
      </defs>

      {/* Central Search Node */}
      <g transform="translate(200, 150)">
        <circle r="40" fill="url(#search-gradient)" stroke="#FFB86F" stroke-width="2" />
        <circle r="20" fill="#FFB86F" fill-opacity="0.2">
          {/* @ts-ignore */}
          <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />
          {/* @ts-ignore */}
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
        
        {/* Search Icon / Magnifying Glass motif */}
        <path d="M-10 -10 L 10 10 M 5 -5 L 15 -15" stroke="#FFB86F" stroke-width="3" stroke-linecap="round" />
      </g>

      {/* Orbiting Result Nodes */}
      <g>
        <circle r="6" fill="#FFB86F">
          {/* @ts-ignore */}
          <animateMotion dur="4s" repeatCount="indefinite" path="M200 150 m-80 0 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0" />
        </circle>
        <circle r="4" fill="#FFB86F" fill-opacity="0.6">
          {/* @ts-ignore */}
          <animateMotion dur="6s" repeatCount="indefinite" path="M200 150 m-60 40 a 70 50 0 1 0 120 -80 a 70 50 0 1 0 -120 80" />
        </circle>
      </g>

      {/* Connecting Lines (Semantic Links) */}
      <path d="M120 150 L 280 150 M 200 70 L 200 230" stroke="#FFB86F" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="4 4" />
    </svg>
  );
}
