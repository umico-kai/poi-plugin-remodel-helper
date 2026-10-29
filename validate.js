// 语法 + 跨模块引用校验（开发自检，不参与插件运行）
// 依赖 esbuild：优先取本项目的 node_modules，其次取环境变量 ESBUILD_PATH
const fs = require('fs')
const path = require('path')
const os = require('os')

const loadEsbuild = () => {
  try {
    return require('esbuild')
  } catch {}
  if (process.env.ESBUILD_PATH) {
    try {
      return require(process.env.ESBUILD_PATH)
    } catch {}
  }
  return null
}

const esbuild = loadEsbuild()
if (!esbuild) {
  console.log('SKIP: 未找到 esbuild。')
  console.log('      可执行 npm i -D esbuild，或设置环境变量 ESBUILD_PATH 指向 esbuild 包目录。')
  process.exit(0)
}

const ROOT = __dirname

const files = []
;(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue
    const p = path.join(dir, name)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) walk(p)
    else if (p.endsWith('.es')) files.push(p)
  }
})(ROOT)

let failed = false
for (const f of files) {
  try {
    esbuild.transformSync(fs.readFileSync(f, 'utf8'), {
      loader: 'jsx',
      jsx: 'transform',
      format: 'cjs',
      target: 'chrome110',
    })
  } catch (e) {
    failed = true
    console.log('SYNTAX FAIL', path.relative(ROOT, f), '->', e.message)
  }
}

const outfile = path.join(os.tmpdir(), 'poi-plugin-remodel-helper.bundle-check.cjs')
try {
  esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'index.es')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    external: ['react', 'react-dom', 'views/*'],
    loader: { '.es': 'jsx' },
    jsx: 'transform',
    logLevel: 'silent',
  })
  console.log('BUNDLE OK   -> 跨模块引用全部正确')
} catch (e) {
  failed = true
  console.log('BUNDLE FAIL ->', e.message)
}

try {
  fs.unlinkSync(outfile)
} catch {}

console.log(failed ? '\n有校验失败' : '\n全部校验通过')
process.exit(failed ? 1 : 0)
