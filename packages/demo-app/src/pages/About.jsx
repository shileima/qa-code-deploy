import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
        关于我们
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
        这是一个关于页面，用于演示路由监控功能。
      </p>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
        当你导航到这个页面时，开发工具中的路由面板会显示路由变化。
      </p>
      
      <div style={{ marginTop: '2rem' }}>
        <Link
          to="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          返回首页
        </Link>
      </div>
    </div>
  );
};

export default About;
