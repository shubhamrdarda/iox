# Google I/O 2026

An interactive, high-performance particle-based countdown game built for the Google I/O 2026 "Vibe & Shine" challenge. This project leverages the HTML5 Canvas API to create a "Railgun" breakout-style game where players "ignite" the countdown numbers through fluid physics and iridescent effects.

## 🚀 Key Features

- **2026 Particle Engine**: Every number in the countdown (10 through 1) and the final Trophy is composed of exactly **2,026 beads**, celebrating the year of the event.
- **Gemini Aesthetics**: Visuals are inspired by Google's Gemini AI, featuring glass-morphism, iridescent gradients, and ambient mesh glows.
- **Railgun Physics**: A high-energy "penetrating" ball mechanic that tears through blocks without losing momentum, ensuring a fast-paced and satisfying experience.
- **Dynamic Difficulty**: The game tracks consecutive hits to increase ball speed and blast radius, rewarding skilled players.
- **Mobile Optimized**: Fully responsive UI and touch-input support, ensuring a premium experience on both desktop and mobile devices.
- **Jekyll Integration**: Ready for GitHub Pages with a structured `_config.yml` and Liquid-processed metadata.

## 🛠️ Technical Details

- **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Rendering**: 2D Canvas API with optimized path operations for 60FPS performance.
- **Sampling**: High-resolution silhouette sampling used to generate organic-looking digits.
- **Layout**: `clamp()`-based responsive typography and glass-morphic HUD cards.

## 💻 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge).
- (Optional) Jekyll installed if you wish to build the site locally with `_config.yml` variables.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/shubhamrdarda/iox.git
   ```
2. Navigate to the project directory:
   ```bash
   cd iox
   ```
3. Open `index.html` in your browser, or serve it using a local server:
   ```bash
   jekyll serve
   ```

---
Powered by Gemini • Google I/O 2026
