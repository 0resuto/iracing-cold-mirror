import { JSDOM } from 'jsdom';
const dom = new JSDOM(`<!DOCTYPE html><div id="speed"></div><div id="inputs"></div>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.ResizeObserver = class ResizeObserver { observe() {} disconnect() {} };

// Mock canvas
global.HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: (x, y, w, h) => ({ data: new Array(w * h * 4) }),
  putImageData: () => {},
  createImageData: () => ([]),
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  transform: () => {},
  rect: () => {},
  clip: () => {},
  lineTo: () => {},
  lineWidth: 1,
  strokeStyle: '',
  fillStyle: '',
  lineJoin: '',
});

import uPlot from 'uplot';

const THEME = {
  grid: 'rgba(255, 255, 255, 0.15)',
  text: '#a1a1aa',
  speed: '#EF4444',
  throttle: '#10B981',
  brake: '#EF4444',
  steering: '#eaeaea',
};

try {
    const commonOpts = {
      width: 800,
      height: 200,
      legend: { show: false },
      cursor: { show: false },
      axes: [
        { show: false }, 
      ]
    };

    const speedOpts = {
      ...commonOpts,
      scales: {
        x: { time: false },
        y: { auto: true, range: (u, min, max) => [0, Math.max(50, Math.ceil(max * 1.1 / 10) * 10)] }
      },
      axes: [
        { show: false },
        { stroke: THEME.text, grid: { stroke: THEME.grid, dash: [3, 3] }, size: 35, font: "9px Inter" }
      ],
      series: [
        {}, 
        { stroke: THEME.speed, width: 2, paths: uPlot.paths.stepped({ align: 1 }) }
      ]
    };

    const speedPlot = new uPlot(speedOpts, [[], []], document.getElementById('speed'));
    console.log("Speed plot initialized successfully");

    // Let's add some data
    const time = [100.1, 100.2, 100.3];
    const speed = [0, 50, 100];
    speedPlot.setData([time, speed]);
    console.log("Speed data set successfully");

    const inputsOpts = {
      ...commonOpts,
      scales: {
        x: { time: false },
        pedals: { range: [0, 1] },
        steering: { range: [-180, 180] }
      },
      axes: [
        { show: false },
        { scale: 'pedals', stroke: THEME.text, grid: { stroke: THEME.grid, dash: [3, 3] }, size: 35, font: "9px Inter", values: (u, vals) => vals.map(v => (v*100).toFixed(0)) },
        { scale: 'steering', side: 1, stroke: THEME.steering, grid: { show: false }, size: 35, font: "9px Inter" }
      ],
      series: [
        {}, 
        { scale: 'pedals', stroke: THEME.throttle, fill: 'rgba(16, 185, 129, 0.15)', width: 1.5, paths: uPlot.paths.stepped({ align: 1 }) }, 
        { scale: 'pedals', stroke: THEME.brake, fill: 'rgba(239, 68, 68, 0.25)', width: 1.5, paths: uPlot.paths.stepped({ align: 1 }) }, 
        { scale: 'steering', stroke: THEME.steering, width: 1.5, paths: uPlot.paths.stepped({ align: 1 }) } 
      ]
    };

    const inputsPlot = new uPlot(inputsOpts, [[], [], [], []], document.getElementById('inputs'));
    console.log("Inputs plot initialized successfully");

    const thr = [0, 0.5, 1];
    const brk = [1, 0, 0];
    const str = [0, -90, 90];
    inputsPlot.setData([time, thr, brk, str]);
    console.log("Inputs data set successfully");

} catch (err) {
    console.error("Error occurred:", err);
}
