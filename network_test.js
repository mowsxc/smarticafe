// 网络连接诊断脚本
// 在浏览器控制台中运行此脚本

async function testNetworkAccess() {
  console.log('🔍 开始网络连接诊断...\n');

  const tests = [
    { url: 'http://localhost:32520', name: '本地开发服务器' },
    { url: 'http://127.0.0.1:32520', name: '本地回路' },
    { url: 'http://192.168.1.168:32520', name: '网络接口访问' }
  ];

  for (const test of tests) {
    try {
      console.log(`测试 ${test.name}: ${test.url}`);
      const start = Date.now();
      const response = await fetch(test.url, { method: 'HEAD', timeout: 5000 });
      const end = Date.now();

      if (response.ok) {
        console.log(`✅ ${test.name} - 连接成功 (${end - start}ms)`);
      } else {
        console.log(`❌ ${test.name} - HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} - 连接失败: ${error.message}`);
    }
    console.log('');
  }

  // 检查防火墙和端口状态
  console.log('🔥 防火墙检查建议:');
  console.log('1. 确保Windows防火墙允许端口32520');
  console.log('2. 或者暂时关闭Windows防火墙进行测试');
  console.log('3. 检查杀毒软件是否阻止了连接\n');

  console.log('🌐 网络配置检查:');
  console.log('- 开发服务器应绑定到 0.0.0.0:32520');
  console.log('- 从其他设备访问时，使用这台机器的实际IP地址');
  console.log('- 确保两台设备在同一网络段\n');

  console.log('💡 故障排除步骤:');
  console.log('1. 在开发机器上运行: netstat -ano | findstr :32520');
  console.log('2. 在客户端机器上运行: ping 192.168.1.168');
  console.log('3. 在客户端机器上运行: telnet 192.168.1.168 32520');
}

// 运行测试
testNetworkAccess();