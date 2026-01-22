/**
 * 自动备份脚本 - SmartiCafe v2.0.0
 * 
 * 功能：
 * 1. 检测文件变更
 * 2. 自动 git add + commit
 * 3. 自动推送到远程
 * 4. 更新 todolist.md
 * 
 * 使用方法：
 * - 手动运行: node scripts/auto-backup.js
 * - 定时运行: 添加到 package.json scripts
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// 获取变更文件列表
function getChangedFiles() {
  try {
    const output = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

// 获取 git diff 统计
function getDiffStats() {
  try {
    const output = execSync('git diff --stat', { cwd: projectRoot, encoding: 'utf8' });
    return output;
  } catch {
    return '';
  }
}

// 自动提交
function autoCommit(message) {
  try {
    execSync(`git add -A`, { cwd: projectRoot });
    execSync(`git commit -m "${message}"`, { cwd: projectRoot });
    console.log('✅ 自动提交成功');
    return true;
  } catch (e) {
    console.log('ℹ️  没有需要提交的变更或提交失败');
    return false;
  }
}

// 推送到远程
function pushToRemote(branch = 'refactor/api-and-naming') {
  try {
    execSync(`git push origin ${branch}`, { cwd: projectRoot });
    console.log('✅ 推送到远程成功');
    return true;
  } catch {
    console.log('⚠️  推送失败，可能需要手动解决冲突');
    return false;
  }
}

// 更新 todolist.md
function updateTodolist() {
  const todolistPath = join(projectRoot, 'todolist.md');
  if (!existsSync(todolistPath)) {
    console.log('ℹ️  todolist.md 不存在，跳过更新');
    return false;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const content = readFileSync(todolistPath, 'utf8');
  
  // 检查是否今天已更新
  if (content.includes(today)) {
    console.log('ℹ️  todolist.md 今天已更新');
    return false;
  }
  
  console.log('⚠️  建议更新 todolist.md');
  return false;
}

// 主函数
async function main() {
  console.log('🔄 SmartiCafe 自动备份脚本');
  console.log('='.repeat(50));
  
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('ℹ️  没有检测到文件变更');
    return;
  }
  
  console.log(`📝 检测到 ${changedFiles.length} 个变更文件`);
  console.log(getDiffStats());
  
  // 提示更新文档
  console.log('\n⚠️  请确认是否需要更新以下文档：');
  console.log('   - todolist.md');
  console.log('   - AGENTS.md');
  console.log('   - 其他相关文档');
  
  // 自动提交
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const message = `chore: 自动备份 ${timestamp}`;
  
  const committed = autoCommit(message);
  
  if (committed) {
    pushToRemote();
  }
  
  console.log('\n✅ 备份完成');
}

// 导出供其他脚本使用
export { getChangedFiles, getDiffStats, autoCommit, pushToRemote, updateTodolist };

// 如果直接运行此脚本
main().catch(console.error);
