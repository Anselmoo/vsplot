const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir);
}

const vendors = [
  { from: path.join(root, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'), to: path.join(mediaDir, 'chart.umd.js') },
  { from: path.join(root, 'node_modules', 'chartjs-plugin-zoom', 'dist', 'chartjs-plugin-zoom.umd.js'), to: path.join(mediaDir, 'chartjs-plugin-zoom.umd.js') },
  { from: path.join(root, 'node_modules', 'chartjs-adapter-date-fns', 'dist', 'chartjs-adapter-date-fns.bundle.js'), to: path.join(mediaDir, 'chartjs-adapter-date-fns.bundle.js') }
];

vendors.forEach(v => {
  if (fs.existsSync(v.from)) {
    fs.copyFileSync(v.from, v.to);
    console.log('Copied', v.from, '->', v.to);
  } else {
    console.warn('Vendor file not found:', v.from);
  }
});
