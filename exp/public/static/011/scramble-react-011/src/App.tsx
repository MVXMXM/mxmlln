import React from 'react';
import './App.css';
import { TextScramble } from './components/TextScramble';

function App() {
  return (
    <div className="App" style={{ fontFamily: 'IBM Plex Mono, monospace', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
      <TextScramble>
        <span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span>Y</span><span>U</span><span>T</span><span>O</span><span>R</span><span>I</span><span>/</span><span>&</span><span>;</span><span>#</span><span>)</span><span>!</span><span>*</span><span>(</span><span>9</span><span>+</span><span>~</span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span><span> </span>
        {/* ... Add the rest of your ASCII art spans here ... */}
      </TextScramble>
    </div>
  );
}

export default App; 
