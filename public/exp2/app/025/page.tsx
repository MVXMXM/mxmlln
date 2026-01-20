import Spline from '@splinetool/react-spline/next';

export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px'
      }}>
        <div style={{
          width: '400px',
          height: '400px',
          borderRadius: '12px',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}>
          <Spline
            scene="https://prod.spline.design/CevtQn0pvzPcYRxu/scene.splinecode" 
          />
        </div>
      </div>
    </main>
  );
}
