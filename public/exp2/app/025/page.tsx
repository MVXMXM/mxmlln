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
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          padding: '0 24px'
        }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '48px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            lineHeight: '1.2'
          }}>
            Hello world.
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '20px',
            margin: '0',
            lineHeight: '1.6'
          }}>
            We are just testing some splines.
          </p>
        </div>
      </div>
    </main>
  );
}
