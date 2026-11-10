const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\\/[]{}—=+*^?#@%&$£§¢¥€•.,;:~|()[]{}';

function randomChar() {
  return charSet[Math.floor(Math.random() * charSet.length)];
}

let html = fs.readFileSync(filePath, 'utf8');

// Replace <span>@</span> with <span>RANDOM</span> (70% of the time)
html = html.replace(/<span>@<\/span>/g, match => {
  return Math.random() < 0.7
    ? `<span>${randomChar()}</span>`
    : match;
});

fs.writeFileSync(filePath, html, 'utf8');
console.log('Randomized @ symbols in index.html');