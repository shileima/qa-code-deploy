import { Link } from 'react-router-dom';
import { useAppConfig, getCurrentSubdomainPrefix } from '../utils/urlConfig';

const Home = () => {
  const { prefix, config, isPrefix } = useAppConfig();
  
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* 显示当前 URL 前缀信息 */}
      <div style={{ 
        padding: '1rem', 
        marginBottom: '1rem', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '4px',
        border: `2px solid ${config.theme.primaryColor}`
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: config.theme.primaryColor }}>
          URL 前缀配置信息
        </h3>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>子域名前缀:</strong> {prefix || '无（使用默认配置）'}
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>应用名称:</strong> {config.appName}
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>当前 URL:</strong> {window.location.href}
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>主色调:</strong> <span style={{ color: config.theme.primaryColor }}>●</span> {config.theme.primaryColor}
        </p>
      </div>
      
      <h1 style={{ 
        fontSize: '2rem', 
        marginBottom: '1rem', 
        color: config.theme.primaryColor,
        borderBottom: `3px solid ${config.theme.primaryColor}`,
        paddingBottom: '0.5rem'
      }}>
        🚀 欢迎来到 {config.appName} [HMR 测试]
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
        这是一个演示页面，用于展示渲染监控功能。
        {prefix && (
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.9rem', color: config.theme.secondaryColor }}>
            当前运行在子域名前缀: <strong>{prefix}</strong>
          </span>
        )}
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Link
          to="/about"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: config.theme.primaryColor,
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          关于我们
        </Link>
        <Link
          to="/contact"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: config.theme.secondaryColor,
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          联系我们
        </Link>
      </div>

      {/* 根据配置显示不同的功能 */}
      {config.features.showFeatureA && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: config.theme.backgroundColor,
          border: `2px solid ${config.theme.primaryColor}`,
          borderRadius: '4px',
          boxShadow: `0 2px 8px ${config.theme.primaryColor}40`
        }}>
          <h3 style={{ color: config.theme.primaryColor, marginTop: 0 }}>
            ✅ 功能 A（仅实例 A 显示）
          </h3>
          <p>这是根据 URL 前缀配置显示的功能模块。</p>
          <p style={{ fontSize: '0.9rem', color: config.theme.secondaryColor }}>
            🔵 蓝色主题应用 - 当前时间: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}
      
      {config.features.showFeatureB && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: config.theme.backgroundColor,
          border: `2px solid ${config.theme.secondaryColor}`,
          borderRadius: '4px',
          boxShadow: `0 2px 8px ${config.theme.secondaryColor}40`
        }}>
          <h3 style={{ color: config.theme.secondaryColor, marginTop: 0 }}>
            ✅ 功能 B（仅实例 B 显示）
          </h3>
          <p>这是根据 URL 前缀配置显示的功能模块。</p>
          <p style={{ fontSize: '0.9rem', color: config.theme.secondaryColor }}>
            🟢 绿色主题应用 - 当前时间: {new Date().toLocaleTimeString()}
          </p>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>测试功能</h2>
        <button
          onClick={() => {
            console.log('这是一条普通日志');
          }}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          测试 Console.log
        </button>
        <button
          onClick={() => {
            console.error('这是一条错误日志');
          }}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          测试 Console.error
        </button>
        <button
          onClick={() => {
            throw new Error('这是一个测试错误');
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffc107',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          触发错误
        </button>
      </div>
    </div>
  );
};

export default Home;
